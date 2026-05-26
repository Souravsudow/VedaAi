import puppeteer from "puppeteer";

export async function renderPaperPdf(paper: any, assignment: any) {
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Inter, Arial, sans-serif; padding: 38px; color: #101828; }
        header { border-bottom: 2px solid #101828; padding-bottom: 18px; margin-bottom: 24px; }
        h1 { margin: 0 0 8px; font-size: 28px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
        .line { border-bottom: 1px solid #98a2b3; padding-bottom: 8px; }
        h2 { margin: 28px 0 8px; font-size: 20px; }
        .q { margin: 13px 0; line-height: 1.45; }
        .badge { display: inline-block; border: 1px solid #d0d5dd; border-radius: 999px; padding: 2px 7px; font-size: 11px; margin-left: 6px; }
      </style>
    </head>
    <body>
      <header>
        <h1>${assignment.title}</h1>
        <div>${assignment.subject} • ${assignment.classLevel} • ${paper.totalMarks} marks</div>
        <div class="meta">
          <div class="line">Student name:</div>
          <div class="line">Roll number:</div>
          <div class="line">Section:</div>
          <div class="line">Due date: ${assignment.dueDate}</div>
        </div>
      </header>
      ${paper.sections
        .map(
          (section: any) => `<section>
            <h2>${section.title}</h2>
            <p><strong>${section.instruction}</strong></p>
            ${section.questions
              .map(
                (q: any, index: number) =>
                  `<div class="q">${index + 1}. ${q.text} <strong>[${q.marks}]</strong><span class="badge">${q.difficulty}</span><span class="badge">${q.topic}</span></div>`
              )
              .join("")}
          </section>`
        )
        .join("")}
    </body>
  </html>`;

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();
  return pdf;
}
