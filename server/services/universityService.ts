import type { University } from "@prisma/client";
import { prisma } from "../db.js";
import { ApiError } from "../errors.js";

interface KnownUniversity {
  name: string;
  domain: string;
  aliases: string[];
}

export const knownUniversities: KnownUniversity[] = [
  {
    name: "МУИС",
    domain: "stud.num.edu.mn",
    aliases: ["stud.num.edu.mn", "num.edu.mn"]
  },
  {
    name: "СЭЗИС",
    domain: "ufe.edu.mn",
    aliases: ["ufe.edu.mn"]
  },
  {
    name: "ХААИС",
    domain: "muls.edu.mn",
    aliases: ["muls.edu.mn"]
  },
  {
    name: "Хүмүүнлэгийн их сургууль",
    domain: "humanities.mn",
    aliases: ["humanities.mn"]
  },
  {
    name: "Этүгэн их сургууль",
    domain: "etugen.edu.mn",
    aliases: ["etugen.edu.mn"]
  }
];

export function getEmailDomain(email: string) {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export function detectUniversityFromEmail(email: string) {
  const domain = getEmailDomain(email);
  const known = knownUniversities.find((university) =>
    university.aliases.some((alias) => domain === alias || domain.endsWith(`.${alias}`))
  );

  if (known) return known;

  if (!domain) {
    throw new ApiError(400, "Оюутны имэйл хаяг буруу байна.");
  }

  return {
    name: domain,
    domain,
    aliases: [domain]
  };
}

export async function ensureKnownUniversities() {
  await Promise.all(
    knownUniversities.map((university) =>
      prisma.university.upsert({
        where: { domain: university.domain },
        update: { name: university.name },
        create: {
          name: university.name,
          domain: university.domain
        }
      })
    )
  );
}

export async function ensureUniversityForEmail(email: string): Promise<University> {
  const detected = detectUniversityFromEmail(email);

  return prisma.university.upsert({
    where: { domain: detected.domain },
    update: { name: detected.name },
    create: {
      name: detected.name,
      domain: detected.domain
    }
  });
}
