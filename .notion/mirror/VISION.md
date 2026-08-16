<!-- notion-sync
page: VISION.md
id: 3bea13e24a178057af8ee25310b39749
url: https://app.notion.com/p/3bea13e24a178057af8ee25310b39749
fetched: 2026-08-16
Machine-written mirror of the Notion page. Do not edit by hand.
-->

we wanna write a [VISION.md](http://vision.md/) file - here'e the outline:
- what is aOS?
	- graphical interface on top of OpenClaw or Hermes
		- it's like OpenClaw/Hermes are the kernel of this os
		- we're gonna create a GUI layer on top
		- similar to how we install software on our OS now, during setup of aOS, user must connect it to different things e.g. gmail, calendar, slack, uber, other apps providing mcp or something similar
	- main UX: "voice as input" - "visuals as output"
		- remember Her - the movie?  -
		- another close example is Jarvis (Iron Man)
		- the vision:
			- people will not touch a keyboard by default
			- they talk and watch what happens on a display
	- everyone can name their aOS — I'll name mine "kokab"
		- in the setup is should be connected to an underlying agent CLI e.g. claude code
	- works with voice - no screens - I'll call "hey kokab" and it wakes up
	- works with screen:
		- a browser based GUI cockpit — minimal
			- generates on demand html-based infographs — dynamic UI generation
				- its visual language is via on demand generation of html
			- the user is never gonna see a "chat" with the agent — agent responds in visuals or actions
	- developer toolkit?
		- **On-demand Generated UI**
			- MCP Apps: https://modelcontextprotocol.io/extensions/apps/overview
			- A2UI by Google: https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/
			- AG-UI: https://github.com/ag-ui-protocol/ag-ui
			-
		- how can people develop apps for this aOS
		- app/agent marketplace?
- who is it for?
	- everyone
		- my grandma
			- doesn't know how to code or how to use claude code or openclaw
			- she knows how to talk
			- she can look at pictures and images to understand them
		- tech-familiar
			- for day to day work
			- main - agentic - interface with computers
			- someone developing via Claude code can just talk to the agents and "watch" what the agent(s) are doing in response
- privacy is of course an open question — guardrails need more formal definition
-
- a few use case examples
	- ask for an uber, goes on the browser tries to login uber, show me the login screen, I enter credentials, they are saved securely and privately so agent can use in the future but not see. From then onwards, agent can use uber app. It will pick the origin and destination, show me the route on the uber app itself, I confirm, it gets the uber and informs me of ETA and details.
	- I ask it to do some research on a topic, it will do research and create a visual interface, an on-demand html page showing me the results of the research
	- I ask it to take notes, it will open my default notes app, create a new note and cleanup add my rambling into a new note it can retrieve later
	- I ask it to add stuff to my calendar and it does, then when asked about what does my week look like, will open the calendar app on the web and show me it.
	- I want to make a video call with my brother, it will know through its memories who my brother is (if doesn't, then ask me first time) and will make a video call on my default app of choice (e.g. whatsapp) and show me that app's view.

dump:
I'd like to know if there are any efforts in coming up with on-demand interactive UIs for agents. I know for example there are claude artifacts but they are extremely primitive, I'm thinking something sci-fi level where the agent's primary interface with the user is through building UIs user can interact with on-demand, or pulling in the actual UI from somewhere else, like having the desktop to operate, something like grok-bot is interesting particularly because they give an agent a full desktop it can operate, and so it means it can have a browser and use that browser to login to different apps, and have all your workflows and files and such, and then show you. I'm thinking of a jarvis style voice as input and visuals as output, in a way that user doesn't need to care about the details under the hood and things just happen. Its kinda like hermes or open-claw but instead of it living in a chat app like telegram, it would live in a browser-like env or an app, and will dynamically interface with user with graphics. I'm thinking at the level of apple products quality, with simple onboarding, you want to login to uber, I just pop up the uber login page and you can safely login there, and the credentials will also be safely and privately stored and agent can use them but not see them on its own computer/browser instance. The key thing here is that the agent should be able to use apps or web apps or the internet under the hood, should be able to pass work to other agents under the hood, should be able to automatically cleanup its own context and have memory and self-learning and all that, but to interface with the user it should be something much more natural and intuitive and UX friendly than text and chat, more like on-demand use existing app UIs by yourself, if you need my input or my confirmation show me something of that app as well (show the route you selected for the uber I requested on the app itself via e.g. an iframe or something, and then close that, and for things that no app is avaialble or custom requests it should also be able to create custom html or alike dashboards to show me stuff or ask me for stuff and all that. I'm looking to see if such a thing exists for lay audience, which also has easy onboarding, because hermes agents and open-claw are still hard and technical to configure and need a lot of knowing access tokens and such
