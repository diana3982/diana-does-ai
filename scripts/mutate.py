"""Mutation sweep: change one thing, and see whether any test notices.

A test that passes against deliberately broken code is not evidence. This
applies a small semantic change to one line of a source file, runs the
suite, and records every mutation that NOTHING caught -- each one is a claim
the tests are not actually making.

Only real code is mutated. The first version of this also rewrote the
insides of docstrings and prompt strings, which turned `and` into `or` in
English and reported 20 "survivors" that were nothing of the kind. Python is
tokenised; JavaScript has its strings, template literals and comments masked
out before matching.

The file is restored in a finally block, so an interrupt cannot leave a
mutated source behind. Do not READ a source file while a sweep is running:
it is mutated in place for the length of one test run, and a read landing in
that window shows code that was never written. (Asked once, believed once.)

    ./venv/bin/python scripts/mutate.py . \
        "./venv/bin/python -m pytest backend/tests -q -x --no-header" \
        backend/quirks.py

A survivor is not automatically a missing test. Judge each one:
  * equivalent   -- the change cannot alter behaviour (`indent=2` -> 3;
                    `round(x, 1)` -> 2 where x never has two decimals)
  * a tuning dial -- 600ms -> 601ms SHOULD survive; pinning it exactly would
                    test the knob rather than the behaviour
  * unreachable  -- a defensive guard no caller can trigger
  * a real gap   -- everything else, and the reason this exists
"""
import io
import re
import subprocess
import sys
import token as tokmod
import tokenize
from pathlib import Path

SWAPS = {
    '>=': '>', '<=': '<', '>': '>=', '<': '<=',
    '==': '!=', '!=': '==',
    'and': 'or', 'or': 'and',
    '&&': '||', '||': '&&',
    'True': 'False', 'False': 'True',
    'true': 'false', 'false': 'true',
}


def python_spans(text):
    """(offset, length, original) for every mutable token -- never a string."""
    lines = text.splitlines(keepends=True)
    starts, total = [], 0
    for line in lines:
        starts.append(total)
        total += len(line)

    out = []
    try:
        for tok in tokenize.generate_tokens(io.StringIO(text).readline):
            if tok.type not in (tokmod.OP, tokmod.NAME, tokmod.NUMBER):
                continue
            row, col = tok.start
            if row - 1 >= len(starts):
                continue
            offset = starts[row - 1] + col
            if tok.string in SWAPS:
                out.append((offset, len(tok.string), tok.string, SWAPS[tok.string]))
            elif tok.type == tokmod.NUMBER and tok.string.isdigit():
                out.append((offset, len(tok.string), tok.string, str(int(tok.string) + 1)))
    except (tokenize.TokenError, IndentationError):
        pass
    return out


JS_MASK = re.compile(
    r'"(?:[^"\\\n]|\\.)*"'      # double-quoted
    r"|'(?:[^'\\\n]|\\.)*'"     # single-quoted
    r'|`(?:[^`\\]|\\.)*`'       # template literal
    r'|//[^\n]*'                # line comment
    r'|/\*[\s\S]*?\*/',         # block comment
)


def js_spans(text):
    """Same, for JS: mask strings and comments, then match in what is left."""
    masked = JS_MASK.sub(lambda m: ' ' * len(m.group(0)), text)
    out = []
    for m in re.finditer(r'[A-Za-z_$][\w$]*|[0-9]+|&&|\|\||[<>!=]=|[<>]', masked):
        word = m.group(0)
        if word in SWAPS:
            out.append((m.start(), len(word), word, SWAPS[word]))
        elif word.isdigit():
            out.append((m.start(), len(word), word, str(int(word) + 1)))
    return out


def sweep(paths, command, cwd):
    survivors, killed = [], 0
    for path in paths:
        p = Path(path)
        original = p.read_text()
        spans = python_spans(original) if p.suffix == '.py' else js_spans(original)
        try:
            for offset, length, was, now in spans:
                p.write_text(original[:offset] + now + original[offset + length:])
                r = subprocess.run(command, cwd=cwd, capture_output=True, shell=True)
                if r.returncode == 0:
                    line = original[:offset].count('\n') + 1
                    src = original.split('\n')[line - 1].strip()
                    survivors.append((path, line, f'{was} -> {now}', src))
                    print(f'  SURVIVED {p.name}:{line}  {was} -> {now}   {src[:70]}',
                          flush=True)
                else:
                    killed += 1
        finally:
            p.write_text(original)
        print(f'  -- {p.name}: {len(spans)} mutants ({killed} caught so far)', flush=True)
    return survivors, killed


if __name__ == '__main__':
    cwd, command, *paths = sys.argv[1:]
    survivors, killed = sweep(paths, command, cwd)
    print(f'\n{killed} caught, {len(survivors)} SURVIVED')
    for path, line, what, src in survivors:
        print(f'  {path}:{line}  [{what}]  {src[:90]}')
