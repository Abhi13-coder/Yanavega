# How to ask any AI for a feature without wasting credits

## Rules of thumb
1. Paste `docs/PROJECT_CONTEXT.md` at the start. Do not re-explain the project.
2. One feature per message. Big requests get long answers and cost the most.
3. Attach only the files that change (plus assets). Never re-upload files the AI already has.
4. Ask for **only the changed files or a patch**, and "no explanations, only a 5-line summary".
5. After testing on your phone, send only the **error text** (last ~30 lines) or one screenshot, not the whole chat history.
6. Say "state assumptions instead of asking questions" so it does not stop to ask.

## Feature template (copy, fill, send)
```
[paste PROJECT_CONTEXT.md]
GOAL: <one sentence, e.g. add traffic cars to Open Road>
WHERE: <files, e.g. content/game/openroad.js>
ASSETS: <attached files / names / sizes>
BEHAVIOR: <3-6 bullet rules the feature must follow>
SETTINGS: <which existing settings it must respect, e.g. gp.traffic>
ACCEPTANCE TEST: <what I will see on my phone if it works>
OUTPUT: only the changed files in full, then 5 lines of notes. No new libraries, no build tools.
```

## Asset prompt template (for image / 3D / audio tools)
- **Texture:** "Seamless tileable <grass/asphalt/…> texture, top-down, 2048x2048, even lighting, no shadows, no text, no watermark."
- **3D model:** "Low-poly <car/tree/building>, game-ready, under 30k triangles, wheels as separate parts, PBR textures separate, Y-up, 1 unit = 1 meter, forward +Z."
- **Audio loop:** "Engine loop, 2 seconds, seamless, constant RPM, no music, 44.1 kHz, WAV." (one file per rpm: idle, mid, high)
- **UI art:** "Anime key art, 16:9, 1920x1080, city + car, no text."

## Credit savers
- Ask for a plan first only for big systems (traffic, story engine); for small tasks ask for the code directly.
- Keep chat sessions per feature; start a new chat for a new feature and paste the context file.
- If something looks wrong, describe it in one line plus one screenshot instead of asking for a redesign.
