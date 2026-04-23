#!/usr/bin/env python3
"""Aggregate existing custom-schema grading.json files in n8n skill workspaces.

The n8n skill workspaces use a flat grading.json schema:
    {"eval_id": N, "eval_name": "...", "score": X, "max_score": Y,
     "assertions": [{"assertion": "...", "pass": true|false, "note": "..."}]}

This script walks an iteration directory, reads every with_skill/grading.json and
without_skill/grading.json (or with_skill/old_skill), and writes benchmark.json +
benchmark.md summarising mean pass-rate per config plus a delta.
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path


def read_grading(p: Path) -> dict | None:
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        print(f"  ! unreadable grading {p}: {e}", file=sys.stderr)
        return None


def read_timing(p: Path) -> dict:
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def score_and_total(g: dict) -> tuple[int, int]:
    summary = g.get("summary") or {}
    if isinstance(summary, dict) and "passed" in summary and "total" in summary:
        return int(summary.get("passed", 0)), int(summary.get("total", 0))
    score = g.get("score")
    mx = g.get("max_score")
    if isinstance(score, (int, float)) and isinstance(mx, (int, float)) and mx > 0:
        return int(score), int(mx)
    a = g.get("assertions") or g.get("expectations") or []
    if not a:
        return 0, 0
    passed = sum(1 for x in a if x.get("pass") or x.get("passed"))
    return passed, len(a)


def pass_rate(g: dict) -> float:
    p, t = score_and_total(g)
    return p / t if t > 0 else 0.0


def aggregate(iter_dir: Path) -> dict:
    eval_dirs = sorted([d for d in iter_dir.iterdir() if d.is_dir() and d.name.startswith("eval-")])
    per_config: dict[str, list[dict]] = {}
    runs: list[dict] = []

    for ed in eval_dirs:
        for cfg_dir in ed.iterdir():
            if not cfg_dir.is_dir():
                continue
            cfg = cfg_dir.name
            g = read_grading(cfg_dir / "grading.json")
            if g is None:
                continue
            t = read_timing(cfg_dir / "timing.json")
            pr = pass_rate(g)
            passed, total = score_and_total(g)
            rec = {
                "eval_id": g.get("eval_id"),
                "eval_name": g.get("eval_name", ed.name),
                "configuration": cfg,
                "pass_rate": pr,
                "passed": passed,
                "total": total,
                "time_seconds": t.get("total_duration_seconds", 0.0),
                "tokens": t.get("total_tokens", 0),
                "assertions": g.get("assertions") or g.get("expectations") or [],
            }
            per_config.setdefault(cfg, []).append(rec)
            runs.append(rec)

    def stats(values: list[float]) -> dict:
        if not values:
            return {"mean": 0.0, "stddev": 0.0, "min": 0.0, "max": 0.0, "n": 0}
        return {
            "mean": round(statistics.mean(values), 4),
            "stddev": round(statistics.pstdev(values) if len(values) > 1 else 0.0, 4),
            "min": round(min(values), 4),
            "max": round(max(values), 4),
            "n": len(values),
        }

    summary = {}
    for cfg, lst in per_config.items():
        summary[cfg] = {
            "pass_rate": stats([r["pass_rate"] for r in lst]),
            "time_seconds": stats([r["time_seconds"] for r in lst]),
            "tokens": stats([float(r["tokens"]) for r in lst]),
        }

    configs = list(summary.keys())
    primary_name = "with_skill" if "with_skill" in configs else (configs[0] if configs else None)
    baseline_name = next(
        (c for c in ("without_skill", "old_skill", "baseline") if c in configs and c != primary_name),
        None,
    )

    delta = None
    if primary_name and baseline_name:
        p = summary[primary_name]["pass_rate"]["mean"]
        b = summary[baseline_name]["pass_rate"]["mean"]
        delta = {
            "primary": primary_name,
            "baseline": baseline_name,
            "pass_rate_delta": round(p - b, 4),
            "pass_rate_delta_pct_points": round((p - b) * 100, 1),
            "winner": "with_skill" if p > b else ("baseline" if b > p else "tie"),
        }

    return {
        "metadata": {
            "iteration_dir": str(iter_dir),
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "evals_count": len(eval_dirs),
            "configurations": configs,
        },
        "run_summary": summary,
        "delta": delta,
        "runs": runs,
    }


def markdown(b: dict, skill_name: str) -> str:
    meta = b["metadata"]
    summary = b["run_summary"]
    delta = b.get("delta")
    lines = [
        f"# Skill Benchmark: {skill_name}",
        "",
        f"**Generated:** {meta['timestamp']}",
        f"**Iteration:** {meta['iteration_dir']}",
        f"**Evals:** {meta['evals_count']}",
        "",
        "## Pass-rate summary",
        "",
        "| Configuration | Mean pass-rate | Runs | Stddev |",
        "|---------------|----------------|------|--------|",
    ]
    for cfg, s in summary.items():
        pr = s["pass_rate"]
        lines.append(f"| {cfg} | {pr['mean']*100:.1f}% | {pr['n']} | {pr['stddev']*100:.1f}pp |")

    if delta:
        lines += [
            "",
            "## Delta (skill vs baseline)",
            "",
            f"- **Primary:** `{delta['primary']}`",
            f"- **Baseline:** `{delta['baseline']}`",
            f"- **Pass-rate delta:** {delta['pass_rate_delta_pct_points']:+.1f} pp",
            f"- **Winner:** **{delta['winner']}**",
        ]

    lines += ["", "## Per-eval breakdown", "", "| Eval | Configuration | Pass-rate |", "|------|---------------|-----------|"]
    for r in sorted(b["runs"], key=lambda x: (x["eval_id"] or 0, x["configuration"])):
        lines.append(f"| {r['eval_name']} | {r['configuration']} | {r['pass_rate']*100:.0f}% ({r['passed']}/{r['total']}) |")

    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("iteration_dir", type=Path)
    ap.add_argument("--skill-name", default="")
    args = ap.parse_args()
    if not args.iteration_dir.is_dir():
        print(f"Not a directory: {args.iteration_dir}", file=sys.stderr)
        sys.exit(1)
    b = aggregate(args.iteration_dir)
    out_json = args.iteration_dir / "benchmark.json"
    out_md = args.iteration_dir / "benchmark.md"
    out_json.write_text(json.dumps(b, indent=2), encoding="utf-8")
    name = args.skill_name or args.iteration_dir.parent.name.replace("-workspace", "")
    out_md.write_text(markdown(b, name), encoding="utf-8")
    print(f"Wrote: {out_json}")
    print(f"Wrote: {out_md}")
    if b.get("delta"):
        d = b["delta"]
        print(f"  delta: {d['pass_rate_delta_pct_points']:+.1f} pp  winner={d['winner']}")


if __name__ == "__main__":
    main()
