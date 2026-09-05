# aOS — Design decisions

> Upstream: [DESIGN.md in Notion](https://app.notion.com/p/3bfa13e24a17810fa44ed66568286bc7) (`3bfa13e24a17810fa44ed66568286bc7`).
> Notion is the source of truth. Edit there, not here.
>
> Written 2026-08-16. `VISION.md` says what we want; this says what we decided.

## What it is

An operating system for an agent that works on your behalf.

You talk. The screen shows what is happening. You can touch the screen at any
moment. There is no chat to read.

Underneath is Hermes, which does the work and remembers. On top is a screen
Hermes controls — but only through rules it cannot break.

## The one-line idea

Linux made a thousand decisions so people would not have to think about how to
use a computer. Nobody has made those decisions for an agent using a computer on
a person's behalf. aOS is that set of decisions.

## What is actually new

Several groups already let an agent draw a screen — Google's A2UI, MCP Apps,
AG-UI. That part is solved. We will use it.

Nobody has decided the rest. Which app serves "get me a car." Where a saved file
goes. What needs your thumb first. That is aOS.

## Who it is for

Normal people. Not developers.

The test: someone who does not know Uber exists asks for a car. The agent finds
Uber, installs it, and hands them a login screen to fill in. **Onboarding is a
task the agent does, not a thing the user does.**

## The screen

One screen. Always there. Never a chat.

Tiles sit side by side. They never stack on top of each other.

The agent says *what* to show, *how important* each thing is, and *what belongs
together*. The renderer decides where things go. **The agent never sets a
position or a size.** That single rule is what stops it building a broken screen.

The agent can speak while it shows. Speech narrates and asks. The screen carries
content. Never the other way round.

## Two layers

**Layer one** is our screen language. A closed set of blocks. One way to draw
each. Unlimited ways to combine them.

**Layer two** is other people's apps, shown whole.

The rule for choosing: **if the user is looking at the app, show the app. If the
user is looking at data from apps, show our screen.** Uber's map with the car
moving is the app. Four restaurants to compare is data.

Other people's apps take the full screen. We do not squeeze them into a tile. A
small strip always survives: what the agent is doing, the voice button, the way
back. The agent cannot hide it.

## The blocks — 14 for v1

| Group   | Blocks                                       |
| ------- | -------------------------------------------- |
| Layout  | Row, Column, Card                            |
| Content | Text, Image, DataView                        |
| Input   | Button, TextField, ChoicePicker              |
| System  | Confirm, Ask, Status, Error, Foreign         |

DataView takes data and a shape: table, board, gallery, calendar, or timeline. A
week calendar is not a block. It is a shape.

Chart comes later, built by us. Map comes later, borrowed.

We build on A2UI, which gives most of this free. We keep our own names in front
of it, so their changes do not become our changes.

## How the screen changes

First turn draws everything. After that, changes only.

A tile nothing touched stays exactly as it was. Inside a tile, blocks have stable
names — so if you typed half an address and the agent updates that tile, your
typing survives.

## How you act

Typing is not acting. Four things count: pressing a button, confirming,
submitting a form, the voice button.

When you act, the agent gets one message: which block, what happened, and
everything currently in that tile. Never a click. Never a coordinate.

You take over an app by touching it, the way you take the wheel from lane assist.

## The decisions we made for the agent

Fixed. The agent cannot argue with them.

- **Which app.** First time you ask for something new, the agent picks and asks.
  That becomes the default. The list is a file you can open and change.
- **Where files go.** One folder tree the agent owns. It never picks a path — it
  calls one save function and the layout decides. It writes nowhere else unless
  you hand it a path.
- **Passwords.** The system keychain. The agent gets a handle, never the value.
- **What needs your thumb.** Six things, always: spend money, send a message as
  you, delete anything, agree to terms or grant a permission, type into a login
  or payment field, move a file off your machine. Everything else a small model
  judges. The six are enforced outside the agent, so confidence never lets it
  skip them.
- **Memory.** Hermes handles it. The agent learns your preferences and how you
  like things done — the way an assistant learns about the person they work for.
- **When it fails.** It retries. When it cannot get through it shows an Error
  block and asks. It never goes quiet.
- **When it is busy.** A long job becomes a small Status tile and stays on screen
  while you do something else.
- **When nothing is happening.** An ambient screen with the time and the day.

## How we read other people's pages

Through the accessibility tree — the same structure a screen reader uses.

This is the neat part: that tree speaks in roles like button, list, and table.
Our blocks come from those same roles. **The agent reads the world and writes the
screen in one vocabulary.**

Limit: pages drawn as pictures or canvas have no tree. Accepted for v1.

## What we build first

Desktop only. A local app on your own machine, using your own browser with your
own logins.

Local removes four problems at once: no bot detection, no cloud cost, no lag, and
your logins are already there.

Phone comes later, and it cannot be a copy — a phone cannot drive a browser in
the background. The phone will be a screen for your desktop. One rule protects
that now: **nothing in the screen language may name a platform.** No pixel sizes,
no Mac-only widgets, no file paths.

**Done means: I use it myself.** Two tasks, five times in a row — order food on
DoorDash, add an event to my calendar.

## What is weak, and we say so

- **First run.** The agent guides you through everything except getting a model.
  Before there is a model there is no agent. That is the one step a normal person
  cannot do. Unsolved.
- **Passwords.** The agent never reads them. It still drives a logged-in browser,
  so it can do anything that account can do. That is the honest price.
- **Terms of service.** Driving Uber or a bank in a browser breaks their rules,
  and the risk lands on the user's account. It goes in our terms.
- **Speed.** The screen is fast because we send small changes. The agent thinking
  and clicking through a website is not. We have not measured it.

## Prior art we checked

- **MCP Apps (SEP-1865)** — official MCP extension since 2026-01-26. Servers ship
  HTML in a sandboxed iframe, predeclared as `ui://` resources. Hosts: Claude,
  ChatGPT, VS Code Copilot, Goose, Postman.
- **OpenAI Apps SDK** — ~65 apps in the directory mid-2026. Business and
  productivity heavy. No DoorDash, no Uber.
- **A2UI (Google)** — v0.9. Agent emits JSON, flat list with IDs, client renders
  from a catalog it advertises. 16 standard components. This is our wire format.
- **AG-UI (CopilotKit)** — the event stream layer. A2UI supports it out of the
  box.
- **"Software as Content" (Xie & Xie, arXiv 2603.21334)** — argues our thesis
  independently: chat is the wrong medium, generated applications should be the
  interaction layer. We took evolve-don't-regenerate, anticipatory suggestions,
  and lightest-sufficient-modality from it. We rejected its five intent
  categories as arbitrary, and rejected loosening the catalog — our answer is a
  closed block set with open composition.
- **ARIA roles (~65, W3C)** — the closest thing to a complete UI taxonomy,
  because accessibility forces coverage. Source for our block set and for how we
  read pages.
