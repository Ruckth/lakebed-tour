import { getRequestConfig } from "next-intl/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { defaultLocale, isLocale } from "@/i18n/routing";

async function loadMessages(locale: string) {
  const messagesDirectory = path.join(process.cwd(), "messages");
  try {
    return JSON.parse(await readFile(path.join(messagesDirectory, `${locale}.json`), "utf8"));
  } catch {
    return JSON.parse(await readFile(path.join(messagesDirectory, `${defaultLocale}.json`), "utf8"));
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
