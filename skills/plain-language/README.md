# plain-language

Makes the agent write in plain language: clear, concise, well organized, and pitched at the
reader. The rules come from the digital.gov Plain Language Guide, which carries forward the
federal guidelines behind the Plain Writing Act of 2010. The skill distills that framework
into things the agent does on every piece of prose: lead with the answer, write in active
voice and present tense, say "you" and "we", use familiar words, cut words that do not
work, and shape the page with short paragraphs, informative headings, lists, and tables.

The point is not to dumb things down. It is to spend the reader's attention on the message
instead of on decoding the sentence.

## When you'd want it

Any time the agent produces text a person will read: reports, proposals, emails, memos,
README files, release notes, summaries, and its own replies in chat. It also kicks in when
you ask it to simplify, shorten, clarify, or review text for jargon, passive voice, or
wordiness, even if you never say "plain language".

Pair it with `doc-drafting` for documents that go through review. `doc-drafting` governs
the workflow and the state of the document; this skill governs the sentences inside it.

## Install

**Recommended scope: global.** Writing is ambient across every repo and every chat, and
few projects would think to install a writing skill locally.

```bash
npx skills add --global JarvusInnovations/agent-skills --skill plain-language
```

The skill triggers on its description whenever the agent is about to write prose. To make
it apply to every reply without relying on triggering, add a line to your global
`CLAUDE.md`:

```
Use the plain-language skill for all documents and for every reply to me.
```

## What's inside

- `SKILL.md` — the framework distilled: audience, organization, sentence-level rules, word
  choice, page design, a chat-reply mode, and a self-check list
- `references/principles.md` — guide section: audience, organization, short and simple,
  jargon
- `references/writing.md` — guide section: active voice, tense, hidden verbs, familiar
  terms, style, FAQs
- `references/design.md` — guide section: headings, lists, tables, visuals, links
- `references/testing.md` — guide section: paraphrase, usability, and comparative testing
- `references/plain-writing-act.md` — the law and OMB memo M-11-15
- `references/word-list.md` — substitution tables compiled from the guide, plus a marked
  set of additions
- `scripts/fetch_guide.py` — scrapes the guide and regenerates the reference files

The reference files reproduce the guide's text as published. It is U.S. Government work and
in the public domain. Source: https://digital.gov/guides/plain-language

## Update the references

```bash
cd skills/plain-language
python3 scripts/fetch_guide.py
```

Requires Python 3, `beautifulsoup4`, and `pandoc` on the path. The script fetches each guide
page, strips the site chrome, converts the body to Markdown, and writes one file per section
into `references/`.
