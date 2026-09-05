/**
 * Hand-written screens, standing in for the agent until the Hermes gateway
 * exists. Each one is a whole turn: what Hermes would hand the gateway.
 */
export const FIXTURES: Record<string, string> = {
  'dinner — cards + table': `{% say %}Four places near you. Nari is closest and has a table at half seven.{% /say %}

# Dinner near Mission

{% grid cols=2 %}
{% card title="Nari" %}Thai · 6 min walk
Table at 19:30{% /card %}
{% card title="Lazy Bear" %}American · 12 min
Nothing until Thursday{% /card %}
{% card title="Kin Khao" %}Thai · 9 min
Walk-ins only{% /card %}
{% card title="Al's Place" %}Californian · 4 min
Table at 20:15{% /card %}
{% /grid %}

{% table headers=["Place", "Price", "Free"] rows=[["Nari", "$$$", "19:30"], ["Al's Place", "$$$", "20:15"], ["Kin Khao", "$$", "walk-in"]] /%}`,

  'morning — timeline': `{% say %}Three things today. The dentist moved to half two.{% /say %}

# Thursday

{% timeline title="Today" items=[["09:00", "Standup", "15 min, the usual room"], ["11:30", "Design review", "Mehdi and Mo"], ["14:30", "Dentist", "Moved from 10:00"], ["18:00", "Flight AA118", "SFO, gate B24"]] /%}`,

  'flight — status + numbers': `{% say %}Your flight is delayed forty minutes. Still plenty of time.{% /say %}

# AA118 to London

{% callout type="warning" title="Delayed 40 minutes" %}
New departure 18:40. Gate B24, unchanged.
{% /callout %}

{% grid cols=2 %}
{% stat label="Departs" value="18:40" change="was 18:00" trend="down" /%}
{% stat label="Gate" value="B24" /%}
{% /grid %}

{% progress label="Boarding starts in" value="35" max="100" /%}`,

  'escape hatch — {% html %}': `{% say %}Here is your boarding pass. Screenshot it before you lose signal.{% /say %}

# Boarding pass

{% html title="airline layout" height=190 %}
<div style="border:1px solid #d8dce3;border-radius:14px;overflow:hidden;font-family:inherit">
  <div style="background:#1a56ff;color:#fff;padding:11px 15px;font-weight:600">
    AA118 &nbsp;·&nbsp; SFO → LHR
  </div>
  <div style="display:flex;padding:15px;gap:22px">
    <div><div style="font-size:10px;letter-spacing:.09em;color:#8b95a3">SEAT</div>
         <div style="font-size:27px;font-weight:640">14A</div></div>
    <div><div style="font-size:10px;letter-spacing:.09em;color:#8b95a3">GROUP</div>
         <div style="font-size:27px;font-weight:640">4</div></div>
    <div style="flex:1;text-align:right">
      <div style="font-size:10px;letter-spacing:.09em;color:#8b95a3">BOARDS</div>
      <div style="font-size:27px;font-weight:640">18:05</div></div>
  </div>
  <div style="height:34px;background:repeating-linear-gradient(90deg,#0d0f12 0 2px,transparent 2px 5px);margin:0 15px 15px"></div>
</div>
{% /html %}`,

  'BAD — breaks the budget': `{% say %}Here is everything I found about your question, in detail.{% /say %}

# A very long answer

I looked into this quite carefully and there are a number of things worth
saying about it. First, the situation is more complicated than it appears,
because several of the factors interact with each other in ways that are not
obvious at first glance. Second, there are trade-offs to consider, and the
right answer depends a great deal on what you care about most. Third, I should
mention that some of the sources disagree with one another, which makes a
confident recommendation harder to give than I would like. Fourth, and finally,
the timing matters here as well, since prices and availability both change over
the course of the week and what is true today may not hold tomorrow morning.

{% table headers=["A", "B"] rows=[["1","2"],["3","4"],["5","6"],["7","8"],["9","10"],["11","12"],["13","14"]] /%}

{% stat label="Missing its value" /%}

{% nonsense foo=1 /%}`,
}
