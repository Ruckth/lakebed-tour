import { expect, test, type Page } from "@playwright/test";

const localizedSmoke = [
  { path: "/th", nav: "จอง", chat: "เปิดแชตคอนเซียจ", close: "ปิดแชต", placeholder: "พิมพ์คำถาม" },
  { path: "/zh-CN", nav: "预订", chat: "打开礼宾聊天", close: "关闭聊天", placeholder: "输入问题" },
  { path: "/ja", nav: "予約", chat: "コンシェルジュチャットを開く", close: "チャットを閉じる", placeholder: "質問を入力" },
  { path: "/ko", nav: "예약", chat: "컨시어지 채팅 열기", close: "채팅 닫기", placeholder: "질문 입력" },
  { path: "/fr", nav: "Réserver", chat: "Ouvrir le chat concierge", close: "Fermer le chat", placeholder: "Posez une question" },
  { path: "/de", nav: "Buchen", chat: "Concierge-Chat öffnen", close: "Chat schließen", placeholder: "Frage stellen" },
  { path: "/es", nav: "Reservar", chat: "Abrir chat de conserjería", close: "Cerrar chat", placeholder: "Haga una pregunta" },
  { path: "/ru", nav: "Забронировать", chat: "Открыть чат с консьержем", close: "Закрыть чат", placeholder: "Задайте вопрос" },
  { path: "/it", nav: "Prenota", chat: "Apri chat concierge", close: "Chiudi chat", placeholder: "Fai una domanda" },
  { path: "/hi", nav: "बुक करें", chat: "कंसीयर्ज चैट खोलें", close: "चैट बंद करें", placeholder: "प्रश्न पूछें" },
];

async function chooseLanguage(page: Page, optionName: string) {
  await page.getByLabel("Language").first().click();
  await page.getByRole("option", { name: optionName }).click();
}

test("home page opens chat, shows fallback replies, and exposes contact capture", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Seaview Residence").first()).toBeVisible();
  await page.getByRole("button", { name: "Open concierge chat" }).click({ force: true });

  await expect(page.getByText("Seaview concierge")).toBeVisible();
  await expect(page.getByText("Share contact details")).toBeVisible();

  await page.getByRole("button", { name: /Which villa is best for a couple/i }).click();
  await expect(page.getByText(/The Garden Suite is the quietest couples/i)).toBeVisible();

  await page.getByPlaceholder("Ask a question").fill("Do you have airport pickup?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Do you have airport pickup?")).toBeVisible();
  await expect(
    page.getByText(
      /live chat will connect once Convex is configured|Welcome to Seaview Residence|trouble connecting/i,
    ),
  ).toBeVisible();

  await page.getByText("Share contact details").click();
  await page.getByLabel("Name").fill("Test Visitor");
  await page.getByLabel("Email").fill("visitor@example.com");
  await page.getByLabel("Phone").fill("+66 77 111 222");
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
});

test("thai locale renders translated public UI and chat labels", async ({ page }) => {
  await page.goto("/th");

  await expect(page.getByRole("link", { name: "จอง" }).first()).toBeVisible();
  await page.getByRole("button", { name: "เปิดแชตคอนเซียจ" }).click();

  await expect(page.getByText("คอนเซียจ Seaview")).toBeVisible();
  await expect(page.getByText("ฝากข้อมูลติดต่อ")).toBeVisible();
  await expect(page.getByPlaceholder("พิมพ์คำถาม")).toBeVisible();
});

test("all visible translated locales render localized nav and chat UI", async ({ page }) => {
  for (const locale of localizedSmoke) {
    await page.goto(locale.path);

    await expect(page.getByRole("link", { name: locale.nav }).first()).toBeVisible();
    await page.getByRole("button", { name: locale.chat }).click();
    await expect(page.getByPlaceholder(locale.placeholder)).toBeVisible();
    await page.getByRole("button", { name: locale.close, exact: true }).click();
  }
});

test("language switcher preserves equivalent public routes", async ({ page }) => {
  await page.goto("/rooms/garden-suite");

  await chooseLanguage(page, "ไทย TH");
  await expect(page).toHaveURL(/\/th\/rooms\/garden-suite/);
  await expect(page.getByRole("link", { name: "วิลล่าของเรา" })).toBeVisible();
});

test("language switcher preserves query strings and hash anchors", async ({ page }) => {
  await page.goto("/th/booking?unit=garden-suite&nights=2#villas");

  await chooseLanguage(page, "English EN");
  await expect(page).toHaveURL(/\/booking\?unit=garden-suite&nights=2#villas$/);
});

test("mobile language switcher stays compact while opening full options", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 360 });
  await page.goto("/th");

  const language = page.getByRole("combobox", { name: "Language" });
  await expect(language).toHaveText("TH");
  const box = await language.boundingBox();
  expect(box?.width).toBeLessThan(90);

  await language.click();
  await expect(page.getByRole("option", { name: "ไทย TH" })).toBeVisible();
});

test("locale routing handles canonical English, removed Arabic, and sampled deep links", async ({ page }) => {
  await page.goto("/en");
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/ar");
  await expect(page.getByText("This page could not be found")).toBeVisible();
  await page.getByLabel("Language").first().click();
  await expect(page.getByRole("option", { name: "العربية AR" })).toHaveCount(0);

  await page.goto("/zh-CN/booking");
  await expect(page.getByRole("heading", { name: "预订您的别墅" })).toBeVisible();

  await page.goto("/ja/rooms/garden-suite");
  await expect(page.getByRole("link", { name: "ヴィラ一覧" })).toBeVisible();

  await page.goto("/hi/booking/pay?bookingId=demo");
  await expect(page.getByRole("heading", { name: "डेमो भुगतान पुष्टि करें" })).toBeVisible();
});
