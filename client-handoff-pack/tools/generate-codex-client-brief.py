#!/usr/bin/env python3

from pathlib import Path

from reportlab.lib.colors import HexColor, Color
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "instinct-codex-client-brief.pdf"
WIDTH, HEIGHT = LETTER

BLACK = HexColor("#050506")
CARD = HexColor("#111318")
CARD_2 = HexColor("#171A21")
WHITE = HexColor("#F8F8F6")
MUTED = HexColor("#A8ACB5")
GREEN = HexColor("#32E07A")
PURPLE = HexColor("#9B5CF6")
LINE = HexColor("#2B2E36")


def register_fonts():
    regular = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
    bold = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("InstinctRegular", str(regular)))
        pdfmetrics.registerFont(TTFont("InstinctBold", str(bold)))
        return "InstinctRegular", "InstinctBold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()


class Brief:
    def __init__(self, output):
        output.parent.mkdir(parents=True, exist_ok=True)
        self.c = canvas.Canvas(str(output), pagesize=LETTER)
        self.c.setTitle("Your Website, in Plain English")
        self.c.setAuthor("Instinct Groove")
        self.page = 0

        self.body = ParagraphStyle(
            "body",
            fontName=FONT,
            fontSize=10.2,
            leading=14.2,
            textColor=WHITE,
            spaceAfter=0,
        )
        self.small = ParagraphStyle(
            "small",
            fontName=FONT,
            fontSize=8.6,
            leading=11.6,
            textColor=MUTED,
        )
        self.card_body = ParagraphStyle(
            "card-body",
            fontName=FONT,
            fontSize=8.8,
            leading=12.0,
            textColor=WHITE,
        )
        self.card_body_small = ParagraphStyle(
            "card-body-small",
            fontName=FONT,
            fontSize=7.9,
            leading=10.4,
            textColor=WHITE,
        )
        self.quote = ParagraphStyle(
            "quote",
            fontName=FONT,
            fontSize=9.8,
            leading=13.6,
            textColor=WHITE,
        )
        self.source = ParagraphStyle(
            "source",
            fontName=FONT,
            fontSize=7.2,
            leading=9.5,
            textColor=MUTED,
        )

    def background(self):
        self.c.setFillColor(BLACK)
        self.c.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
        self.c.setFillColor(Color(0.60, 0.36, 0.96, alpha=0.10))
        self.c.circle(WIDTH + 35, HEIGHT - 30, 180, fill=1, stroke=0)
        self.c.setFillColor(Color(0.20, 0.88, 0.48, alpha=0.05))
        self.c.circle(-20, 80, 150, fill=1, stroke=0)

    def page_header(self, title, subtitle=None):
        if self.page:
            self.c.showPage()
        self.page += 1
        self.background()
        self.c.setFillColor(GREEN)
        self.c.setFont(FONT_BOLD, 8)
        self.c.drawString(42, 756, "INSTINCT GROOVE  /  CLIENT BRIEF")
        self.c.setFillColor(MUTED)
        self.c.setFont(FONT, 8)
        self.c.drawRightString(570, 756, f"PAGE {self.page:02d}")
        self.c.setStrokeColor(LINE)
        self.c.line(42, 744, 570, 744)
        self.c.setFillColor(WHITE)
        self.c.setFont(FONT_BOLD, 25)
        self.c.drawString(42, 705, title)
        if subtitle:
            self.c.setFillColor(MUTED)
            self.c.setFont(FONT, 10)
            self.c.drawString(42, 684, subtitle)

    def footer(self):
        self.c.setStrokeColor(LINE)
        self.c.line(42, 39, 570, 39)
        self.c.setFillColor(MUTED)
        self.c.setFont(FONT, 7.5)
        self.c.drawString(42, 24, "Speak about what visitors should see. Codex handles the technical translation.")
        self.c.drawRightString(570, 24, "instinctgroove.com")

    def paragraph(self, text, x, y_top, width, style=None):
        paragraph = Paragraph(text, style or self.body)
        _, height = paragraph.wrap(width, HEIGHT)
        paragraph.drawOn(self.c, x, y_top - height)
        return y_top - height

    def section_label(self, text, x, y):
        self.c.setFillColor(GREEN)
        self.c.roundRect(x, y - 13, 6, 6, 3, fill=1, stroke=0)
        self.c.setFillColor(WHITE)
        self.c.setFont(FONT_BOLD, 9)
        self.c.drawString(x + 14, y - 14, text.upper())

    def card(self, x, y_top, width, title, body, accent=GREEN, min_height=0, small=False):
        title_style = ParagraphStyle(
            "card-title",
            fontName=FONT_BOLD,
            fontSize=10.2,
            leading=12,
            textColor=accent,
        )
        body_style = self.card_body_small if small else self.card_body
        title_p = Paragraph(title, title_style)
        body_p = Paragraph(body, body_style)
        _, title_h = title_p.wrap(width - 28, HEIGHT)
        _, body_h = body_p.wrap(width - 28, HEIGHT)
        height = max(min_height, title_h + body_h + 32)
        y = y_top - height
        self.c.setFillColor(CARD)
        self.c.setStrokeColor(LINE)
        self.c.roundRect(x, y, width, height, 10, fill=1, stroke=1)
        self.c.setFillColor(accent)
        self.c.roundRect(x, y, 4, height, 2, fill=1, stroke=0)
        title_p.drawOn(self.c, x + 16, y_top - 15 - title_h)
        body_p.drawOn(self.c, x + 16, y_top - 20 - title_h - body_h)
        return y

    def chat(self, x, y_top, width, label, text, color):
        label_style = ParagraphStyle(
            "chat-label",
            fontName=FONT_BOLD,
            fontSize=7.5,
            leading=9,
            textColor=color,
        )
        text_style = ParagraphStyle(
            "chat-text",
            fontName=FONT,
            fontSize=9.2,
            leading=12.6,
            textColor=WHITE,
        )
        label_p = Paragraph(label.upper(), label_style)
        text_p = Paragraph(text, text_style)
        _, label_h = label_p.wrap(width - 28, HEIGHT)
        _, text_h = text_p.wrap(width - 28, HEIGHT)
        height = label_h + text_h + 29
        y = y_top - height
        self.c.setFillColor(CARD_2)
        self.c.setStrokeColor(color)
        self.c.roundRect(x, y, width, height, 11, fill=1, stroke=1)
        label_p.drawOn(self.c, x + 14, y_top - 13 - label_h)
        text_p.drawOn(self.c, x + 14, y + 13)
        return y

    def bullet(self, text, x, y_top, width, color=GREEN, small=False):
        style = self.card_body_small if small else self.card_body
        paragraph = Paragraph(text, style)
        _, height = paragraph.wrap(width - 18, HEIGHT)
        self.c.setFillColor(color)
        self.c.circle(x + 3, y_top - 6, 2.2, fill=1, stroke=0)
        paragraph.drawOn(self.c, x + 14, y_top - height)
        return y_top - height - 6

    def flow(self, labels, y):
        x = 42
        gap = 9
        box_w = (528 - gap * (len(labels) - 1)) / len(labels)
        for index, label in enumerate(labels):
            color = GREEN if index in (0, len(labels) - 1) else PURPLE
            self.c.setFillColor(CARD)
            self.c.setStrokeColor(color)
            self.c.roundRect(x, y, box_w, 43, 8, fill=1, stroke=1)
            self.c.setFillColor(WHITE)
            self.c.setFont(FONT_BOLD, 8.2)
            self.c.drawCentredString(x + box_w / 2, y + 17, label)
            if index < len(labels) - 1:
                self.c.setStrokeColor(MUTED)
                self.c.line(x + box_w + 2, y + 21, x + box_w + gap - 2, y + 21)
            x += box_w + gap

    def finish(self):
        self.c.save()


brief = Brief(OUTPUT)

# Page 1 - cover
brief.page_header("Your Website, in Plain English", "A complete beginner's guide to updating Instinct Groove with Codex")
brief.c.setFillColor(PURPLE)
brief.c.circle(510, 590, 54, fill=1, stroke=0)
brief.c.setFillColor(BLACK)
brief.c.setFont(FONT_BOLD, 36)
brief.c.drawCentredString(510, 579, ">")
brief.paragraph(
    "<b>Codex is your website assistant.</b> Describe what visitors should see in ordinary language. Codex finds the right files, makes the change, checks it, saves it to GitHub, and publishes it when the request is ready to go live.",
    42, 635, 398,
)
brief.c.setFillColor(MUTED)
brief.c.setFont(FONT, 9.5)
brief.c.drawString(42, 526, "You are not expected to know HTML, CSS, divs, flex, components, or stylesheets.")
brief.section_label("The simple mental model", 42, 485)
brief.flow(["YOUR IDEA", "CODEX TRANSLATES", "YOU REVIEW", "CODEX PUBLISHES", "VISITORS SEE IT"], 410)
brief.section_label("Three phrases worth remembering", 42, 375)
card_w = 170
brief.card(42, 345, card_w, "Show me first", "Make and check the change, but do not publish it.", GREEN, min_height=90)
brief.card(221, 345, card_w, "Make it live", "Publish the approved change and verify the public page.", PURPLE, min_height=90)
brief.card(400, 345, card_w, "Undo that", "Return only the relevant change to the earlier working version.", GREEN, min_height=90)
brief.chat(42, 220, 528, "Speak about what you can see", "Try: \"the top of the home page,\" \"the purple picture,\" \"the event boxes,\" or \"the phone menu.\" Codex will translate that into the technical work.", PURPLE)
brief.footer()

# Page 2 - asking clearly
brief.page_header("How to ask for a change", "Four details turn a rough idea into an accurate result")
steps = [
    ("1", "Where?", "Name the page or visible area."),
    ("2", "What should be different?", "Describe the result a visitor should notice."),
    ("3", "What must be exact?", "Give the wording, date, link, or attached image."),
    ("4", "Preview or publish?", "Say \"show me first\" or \"make it live.\""),
]
y = 650
for number, title, body in steps:
    brief.c.setFillColor(PURPLE if int(number) % 2 == 0 else GREEN)
    brief.c.circle(58, y - 15, 14, fill=1, stroke=0)
    brief.c.setFillColor(BLACK)
    brief.c.setFont(FONT_BOLD, 10)
    brief.c.drawCentredString(58, y - 18, number)
    brief.c.setFillColor(WHITE)
    brief.c.setFont(FONT_BOLD, 10.5)
    brief.c.drawString(84, y - 11, title)
    brief.c.setFillColor(MUTED)
    brief.c.setFont(FONT, 9)
    brief.c.drawString(84, y - 27, body)
    y -= 57
brief.section_label("Copy this request", 42, 420)
brief.chat(
    42,
    392,
    528,
    "Reusable template",
    "On the <b>[page or visible area]</b>, change <b>[what visitors currently see]</b> to <b>[the result you want]</b>. Use <b>[exact wording, link, or attached image]</b>. Keep <b>[anything that must stay the same]</b>. Show me the phone and computer versions. <b>[Do not publish yet / Make it live after the checks pass.]</b>",
    GREEN,
)
brief.section_label("A strong example", 42, 270)
brief.chat(
    42,
    242,
    528,
    "You say",
    "On the home page, change the August 14 event message to \"Lineup announcement coming Friday.\" Keep the date and the existing purple-and-green style. Show me how it looks on a phone and computer. Do not publish yet.",
    PURPLE,
)
brief.card(42, 125, 528, "When words are hard", "Say: \"I do not know the right website terms. Ask me one simple question at a time, then tell me what you think I mean.\" A screenshot is often better than a technical explanation.", GREEN, min_height=72)
brief.footer()

# Page 3 - prompts
brief.page_header("Prompts you can copy", "Replace the words in brackets and send the message")
prompts = [
    ("Change words", "On the home page, replace \"[old sentence]\" with \"[new sentence].\" Keep everything else the same. Show me first."),
    ("Update an event", "Update the next event to [date]. The venue is [venue], the lineup is [artists], and the ticket link is [URL]. Use the attached poster. Check every place it appears and make it live after verification."),
    ("Adjust the look", "The first section feels cramped. Add breathing room around the main heading without making the page much longer. Keep the fonts and colours. Show phone and computer previews."),
    ("Replace a photo", "Use the attached photo as the main event image. Keep the people centred, do not stretch faces, and make sure it looks clear on phones."),
    ("Fix a link", "The Tickets button on the next event page should open [exact URL]. Check the same button everywhere it appears. Do not change other links."),
    ("Review or undo", "Explain what changed in plain English and show me screenshots. Do not publish. / Restore the live website to how it was before today's update, then verify it."),
]
left, right, width = 42, 312, 258
y_values = [660, 495, 330]
for index, (title, body) in enumerate(prompts):
    x = left if index % 2 == 0 else right
    y = y_values[index // 2]
    brief.card(x, y, width, title, body, GREEN if index % 2 == 0 else PURPLE, min_height=145, small=True)
brief.card(42, 160, 528, "Mood-based requests are welcome", "Try: \"Make this feel more polished and energetic, but keep the black background, purple glow, green accents, and underground event feel. Give me two small options before editing.\"", PURPLE, min_height=83)
brief.footer()

# Page 4 - review
brief.page_header("Review without feeling technical", "Look at the result, not the code")
brief.section_label("Recommended flow", 42, 660)
brief.flow(["ASK", "PREVIEW", "GIVE FEEDBACK", "APPROVE", "PUBLISH"], 590)
brief.section_label("Before publishing, ask for", 42, 555)
y = 525
for text in [
    "A phone screenshot and a computer screenshot.",
    "A three-bullet summary in plain English.",
    "Confirmation that important buttons and links work.",
    "Confirmation that no unrelated parts changed.",
    "A clear statement: <b>Not published yet.</b>",
]:
    y = brief.bullet(text, 42, y, 245)
brief.section_label("Useful feedback", 312, 555)
y = 525
for text in [
    "Keep the new wording, but put the photo back.",
    "Only make the heading smaller on phones.",
    "Undo just the colour change.",
    "Give the title more breathing room.",
    "Show me another option. Do not publish.",
]:
    y = brief.bullet(text, 312, y, 258, color=PURPLE)
brief.chat(42, 310, 528, "Approval phrase", "This version is approved. Make only these reviewed changes live, then confirm the public website matches the preview.", GREEN)
brief.card(42, 195, 528, "You stay in control", "Every published version has a named save point in GitHub. Codex can compare changes, preserve someone else's work, and restore a previous working version without asking you to manage the technical steps.", PURPLE, min_height=88)
brief.footer()

# Page 5 - behind the scenes
brief.page_header("What happens behind the scenes", "You do not need to perform any of these steps")
steps = [
    ("1", "Reads the project guide", "Loads the always-on instructions for this site."),
    ("2", "Translates the request", "Finds the right content, layout, or media source."),
    ("3", "Makes the edit", "Changes only what is needed for the visible result."),
    ("4", "Checks both layouts", "Reviews phone and computer versions, links, and images."),
    ("5", "Creates a save point", "Records a clear GitHub version of the change."),
    ("6", "Safely syncs", "Keeps compatible work that somebody else added."),
    ("7", "Publishes with Pages", "GitHub runs the image safety check and release."),
    ("8", "Checks the public site", "Confirms the requested result before saying live."),
]
for index, (number, title, body) in enumerate(steps):
    col = index % 2
    row = index // 2
    x = 42 if col == 0 else 312
    y = 660 - row * 102
    brief.c.setFillColor(GREEN if col == 0 else PURPLE)
    brief.c.circle(x + 16, y - 18, 13, fill=1, stroke=0)
    brief.c.setFillColor(BLACK)
    brief.c.setFont(FONT_BOLD, 9)
    brief.c.drawCentredString(x + 16, y - 21, number)
    brief.card(x + 38, y, 220, title, body, GREEN if col == 0 else PURPLE, min_height=82, small=True)
brief.card(
    42,
    240,
    528,
    "This specific website",
    "<b>app.js</b> holds most page content and behaviour. <b>styles.css</b> controls appearance. <b>assets/</b> holds approved media and fonts. Small <b>.html</b> files identify public pages. A push to <b>main</b> starts the GitHub Pages release and image audit. You never need to open these files yourself.",
    GREEN,
    min_height=112,
)
brief.footer()

# Page 6 - safety
brief.page_header("Safety, publishing, and conflicts", "Simple client promises for work that affects the live site")
brief.section_label("The promises", 42, 660)
y = 628
for text in [
    "<b>\"Show me first\" never means publish.</b>",
    "<b>\"Make it live\" includes only the task you requested.</b>",
    "Codex does not overwrite another person's compatible changes or hide a problem with a force push.",
    "If two versions represent a real content decision, Codex asks one plain-English question.",
    "A change is not called live until the matching release succeeds and the public page is checked.",
    "Every published version has history and can be restored with a new safe save point.",
]:
    y = brief.bullet(text, 42, y, 528)
brief.card(42, 430, 528, "What a conflict sounds like in plain English", "\"Someone else updated the venue while I was changing the ticket link. Should the newer venue stay?\" Codex keeps both versions safe while you answer. You do not need to understand Git conflicts.", PURPLE, min_height=92)
brief.card(42, 315, 258, "Never paste secrets", "Do not put passwords, payment credentials, private keys, or login codes into a website request. Confirm public dates, venues, prices, artist names, and ticket URLs before publication.", GREEN, min_height=120, small=True)
brief.card(312, 315, 258, "Permission pop-ups", "Codex may pause before GitHub, internet, or protected actions. Approve only when the short reason matches the task you requested. Ask for a plain explanation if it does not.", PURPLE, min_height=120, small=True)
brief.chat(42, 165, 528, "If a release is stopped", "The safety check caught a problem, so the new version is not live yet. Codex will keep the previous site available when possible, fix the issue, and verify again before claiming success.", GREEN)
brief.footer()

# Page 7 - troubleshooting
brief.page_header("When something goes wrong", "Use one of these messages and let Codex investigate")
left_cards = [
    ("I cannot see the update", "Check the latest release and public page. If it is live, help me rule out browser caching."),
    ("It looks wrong on my phone", "On my [phone/browser], this area looks wrong. Use the screenshot. Fix the phone version without changing the computer version."),
    ("The photo crop is bad", "Use the original photo. Keep [person/object] visible and centred. Show the phone crop before publishing."),
    ("I am too frustrated to explain", "I know it feels wrong but cannot name why. Ask one simple visual question at a time and suggest two likely fixes."),
]
y = 660
for index, (title, body) in enumerate(left_cards):
    y = brief.card(42, y, 292, title, body, GREEN if index % 2 == 0 else PURPLE, min_height=91, small=True) - 10

brief.section_label("Tiny glossary", 360, 660)
glossary = [
    ("Codex", "ChatGPT that can inspect, change, test, and publish the site"),
    ("Repository", "The website project and its saved history"),
    ("GitHub", "The shared online home for the project"),
    ("Commit", "A named save point"),
    ("Push", "Sending a save point to GitHub"),
    ("Publish", "Making a GitHub version public"),
    ("Preview", "Looking before it becomes public"),
    ("Conflict", "Two changes touched the same place"),
    ("Responsive", "Adapts to phones and computers"),
]
y = 622
for word, meaning in glossary:
    brief.c.setFillColor(WHITE)
    brief.c.setFont(FONT_BOLD, 7.7)
    brief.c.drawString(360, y, word)
    brief.c.setFillColor(MUTED)
    brief.c.setFont(FONT, 7.2)
    brief.c.drawString(423, y, meaning[:43])
    y -= 23

brief.card(360, 392, 210, "Quick commands", "<b>Preview:</b> Show me first. Do not publish.<br/><b>Publish:</b> Make these approved changes live.<br/><b>Status:</b> Give me the plain-English status.<br/><b>Restore:</b> Undo today's live update and verify it.", PURPLE, min_height=128, small=True)

brief.section_label("Official OpenAI reading", 360, 230)
sources = (
    '<link href="https://learn.chatgpt.com/docs/quickstart" color="#A8ACB5">Getting started</link><br/>'
    '<link href="https://learn.chatgpt.com/docs/agent-configuration/agents-md" color="#A8ACB5">Project guidance with AGENTS.md</link><br/>'
    '<link href="https://learn.chatgpt.com/docs/build-skills" color="#A8ACB5">Reusable Codex skills</link><br/>'
    '<link href="https://learn.chatgpt.com/docs/third-party/github" color="#A8ACB5">Codex and GitHub</link>'
)
brief.paragraph(sources, 360, 198, 210, brief.source)
brief.footer()

brief.finish()
print(OUTPUT)
