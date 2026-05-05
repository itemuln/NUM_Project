import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "public", "data");
const outputPath = path.join(outDir, "num-news-events.json");

const feeds = [
  {
    url: "https://news.num.edu.mn/?feed=rss2",
    category: "news"
  },
  {
    url: "https://news.num.edu.mn/?feed=rss2&cat=2",
    category: "event"
  },
  {
    url: "https://news.num.edu.mn/?tag=%D1%85%D0%B0%D0%BA%D0%B0%D1%82%D0%BE%D0%BD&feed=rss2",
    category: "hackathon"
  },
  {
    url: "https://news.num.edu.mn/?tag=%D0%BE%D0%BB%D0%B8%D0%BC%D0%BF%D0%B8%D0%B0%D0%B4&feed=rss2",
    category: "olympiad"
  }
];

const entityMap = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", "\""],
  ["apos", "'"],
  ["nbsp", " "],
  ["ndash", "-"],
  ["mdash", "-"],
  ["ldquo", "\""],
  ["rdquo", "\""],
  ["lsquo", "'"],
  ["rsquo", "'"]
]);

function decodeEntities(value) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_match, entity) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return entityMap.get(entity) ?? "";
  });
}

function stripCdata(value) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function stripHtml(value) {
  return decodeEntities(stripCdata(value).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function readRawTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? stripCdata(match[1]).trim() : "";
}

function toIsoEventDate(value) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function itemId(url) {
  const postId = url.match(/[?&]p=(\d+)/)?.[1];
  if (postId) return `num-news-${postId}`;

  return `num-news-${Buffer.from(url).toString("base64url").slice(0, 18)}`;
}

function inferCategory(title, fallback) {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes("хакатон") || lowerTitle.includes("hackathon")) {
    return "hackathon";
  }

  if (lowerTitle.includes("олимпиад")) {
    return "olympiad";
  }

  if (
    fallback === "news" &&
    (lowerTitle.includes("зар") || lowerTitle.includes("ажлын байр") || lowerTitle.includes("тэтгэлэг"))
  ) {
    return "announcement";
  }

  return fallback;
}

function parseFeed(xml, fallbackCategory) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((match) => {
    const block = match[1];
    const title = readTag(block, "title");
    const url = readTag(block, "link");
    const eventDate = toIsoEventDate(readTag(block, "event_date"));

    return {
      id: itemId(url),
      title,
      summary: stripHtml(readRawTag(block, "description")),
      category: inferCategory(title, fallbackCategory),
      source: "МУИС мэдээ",
      url,
      publishedAt: new Date(readTag(block, "pubDate")).toISOString(),
      eventDate,
      eventTime: readTag(block, "event_time") || undefined,
      location: readTag(block, "location") || undefined,
      organizer: readTag(block, "organizer") || undefined,
      imageUrl: readTag(block, "thumbnail_url") || undefined
    };
  });
}

async function build() {
  const responses = await Promise.all(
    feeds.map(async (feed) => {
      const response = await fetch(feed.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${feed.url}: ${response.status}`);
      }

      return {
        category: feed.category,
        xml: await response.text()
      };
    })
  );
  const byUrl = new Map();

  responses.forEach((response) => {
    parseFeed(response.xml, response.category).forEach((item) => {
      byUrl.set(item.url, item);
    });
  });

  const items = Array.from(byUrl.values()).sort((first, second) => {
    const firstDate = first.eventDate ?? first.publishedAt;
    const secondDate = second.eventDate ?? second.publishedAt;
    return secondDate.localeCompare(firstDate);
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(items, null, 2)}\n`);
  console.log(`Built ${items.length} NUM news feed items.`);
}

void build();
