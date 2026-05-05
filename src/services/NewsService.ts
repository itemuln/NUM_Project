import type { NewsFeedItem } from "@/types";

export const NewsService = {
  async listItems(signal?: AbortSignal) {
    const response = await fetch("/data/num-news-events.json", {
      cache: "no-cache",
      signal
    });

    if (!response.ok) {
      throw new Error("МУИС-ийн мэдээ уншихад алдаа гарлаа.");
    }

    return (await response.json()) as NewsFeedItem[];
  }
};
