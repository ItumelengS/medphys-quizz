"""
assign-difficulty.py — Assign difficulty ratings (1-10) to all questions.

Usage:
  python scripts/assign-difficulty.py                    # dry-run (prints distribution)
  python scripts/assign-difficulty.py --apply            # writes back to questions.json
  python scripts/assign-difficulty.py --section dosimetry # one section only

Heuristics:
  1-2: Basic recall, definitions, "what is", "stands for", short answers
  3:   Simple recall with moderate detail
  4-5: Applied concepts, single-step reasoning
  5-6: CALC: with simple formula
  7-8: CALC: with multi-step or long explanation
  8-9: Multi-domain, complex synthesis, advanced topics
  9-10: Expert-level (FMEA, Monte Carlo, robust optimization, uncertainty budget)
"""

import json
import re
import argparse
import sys
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "questions.json"


def assign_difficulty(q: dict) -> int:
    """Assign a difficulty 1-10 based on question content heuristics."""
    text = (q["q"] + " " + q.get("e", "")).lower()
    question = q["q"]
    answer = q["a"]
    explanation = q.get("e", "")
    exp_len = len(explanation)

    # Expert-level keywords → 9-10
    expert_keywords = [
        "fmea", "monte carlo", "uncertainty budget", "robust optim",
        "multi-criteria optim", "commissioning model", "sensitivity analysis",
        "stochastic", "convolution/superposition", "boltzmann transport",
    ]
    if any(k in text for k in expert_keywords):
        if "CALC" in question and exp_len > 250:
            return 10
        return 9

    # Multi-domain integrated questions → 7-9
    domain_tags = re.findall(r"\[([A-Z+]+)\]", explanation)
    if domain_tags:
        tag_str = " ".join(domain_tags)
        domain_count = tag_str.count("+") + 1
        if domain_count >= 3:
            return 9
        if domain_count >= 2:
            return 8
        return 7

    # Calculation questions
    if "CALC:" in question or "CALC:" in question.upper():
        # Multi-step calc with long explanation
        if exp_len > 250:
            return 8
        if exp_len > 150:
            return 7
        # Simple formula calc
        if exp_len > 80:
            return 6
        return 5

    # Advanced applied topics (not calc but complex)
    advanced_keywords = [
        "commissioning", "beam model", "heterogeneity correction",
        "penumbra", "field junction", "matchline", "electron return effect",
        "adaptive", "deformable registration", "dose painting",
        "motion management", "4dct", "gating", "tracking",
    ]
    if any(k in text for k in advanced_keywords):
        if exp_len > 200:
            return 8
        return 7

    # Applied knowledge, moderate complexity
    applied_keywords = [
        "calculate", "determine", "compare", "explain why",
        "advantage", "disadvantage", "differ", "relationship",
        "tolerance", "limit", "protocol", "procedure",
        "tg-", "aapm", "trs", "icru",
    ]
    if any(k in text for k in applied_keywords):
        if exp_len > 150:
            return 6
        return 5

    # Moderate recall — medium-length answers with some detail
    if len(answer) > 60 and exp_len > 100:
        return 5
    if len(answer) > 40:
        return 4

    # Basic definitions and recall
    basic_keywords = [
        "stands for", "what is", "what does", "definition of",
        "purpose of", "abbreviation", "acronym", "unit of",
        "symbol for", "name the", "which of the following is",
    ]
    if any(k in text for k in basic_keywords):
        if exp_len > 120:
            return 3
        return 2

    # Short answer, simple recall
    if len(answer) < 25:
        return 2
    if len(answer) < 40:
        return 3

    # Default: moderate
    return 4


def main():
    parser = argparse.ArgumentParser(description="Assign difficulty to questions")
    parser.add_argument("--apply", action="store_true", help="Write changes to JSON")
    parser.add_argument("--section", help="Process one section only")
    parser.add_argument("--file", default=str(JSON_PATH), help="JSON file path")
    args = parser.parse_args()

    path = Path(args.file)
    with open(path) as f:
        data = json.load(f)

    # Distribution tracking
    dist = {i: 0 for i in range(1, 11)}
    section_dist = {}
    total = 0

    for sec_id, qs in data["questions"].items():
        if args.section and sec_id != args.section:
            continue
        sec_dist = {i: 0 for i in range(1, 11)}
        for q in qs:
            d = assign_difficulty(q)
            q["d"] = d
            dist[d] += 1
            sec_dist[d] += 1
            total += 1
        section_dist[sec_id] = sec_dist

    # Print distribution
    print(f"{'Section':12s}  " + "  ".join(f"D{i}" for i in range(1, 11)) + "  Total")
    print("-" * 75)
    for sec_id, sd in section_dist.items():
        counts = "  ".join(f"{sd[i]:3d}" for i in range(1, 11))
        sec_total = sum(sd.values())
        print(f"{sec_id:12s}  {counts}  {sec_total:5d}")

    print("-" * 75)
    counts = "  ".join(f"{dist[i]:3d}" for i in range(1, 11))
    print(f"{'TOTAL':12s}  {counts}  {total:5d}")
    print(f"\nAverage difficulty: {sum(k * v for k, v in dist.items()) / total:.1f}")

    if args.apply:
        with open(path, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"\nWritten to {path}")
    else:
        print("\nDry run — use --apply to write changes")


if __name__ == "__main__":
    main()
