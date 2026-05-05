import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScheduleStore } from "@/hooks/useSchedule";
import { CommunityService } from "@/services/CommunityService";

const yearOptions = ["1-р курс", "2-р курс", "3-р курс", "4-р курс", "Магистр"];
const emailSamples = [
  "23B1NUM2119@stud.num.edu.mn",
  "b23fa1631@ufe.edu.mn",
  "enkhtuya.a@muls.edu.mn",
  "uh@humanities.mn",
  "MMS24D155@etugen.edu.mn"
];

export function OnboardingModal() {
  const isOnboarded = useScheduleStore((state) => state.isOnboarded);
  const currentStudent = useScheduleStore((state) => state.currentStudent);
  const completeOnboarding = useScheduleStore((state) => state.completeOnboarding);
  const [email, setEmail] = useState(currentStudent.email);
  const [program, setProgram] = useState(currentStudent.program);
  const [year, setYear] = useState(currentStudent.year);
  const [classGroup, setClassGroup] = useState(currentStudent.class_group);
  const detectedSchool = CommunityService.detectSchoolFromEmail(email);

  useEffect(() => {
    if (isOnboarded) return;

    setEmail(currentStudent.email);
    setProgram(currentStudent.program);
    setYear(currentStudent.year);
    setClassGroup(currentStudent.class_group);
  }, [currentStudent, isOnboarded]);

  if (isOnboarded) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    completeOnboarding({ email, program, year, classGroup });
  };

  return (
    <div className="scheduler-scrollbar fixed inset-0 z-[60] flex overflow-auto bg-zinc-100 px-4 py-6">
      <section className="m-auto w-full max-w-lg border border-zinc-200 bg-white p-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Эхлэх тохиргоо</div>
          <h1 className="mt-2 text-xl font-semibold text-zinc-950">Төлөвлөгөө гаргах профайл</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Энэ апп нь хичээл сонголтыг баталгаажуулахгүй. Энд төлөвлөгөө гаргаад, найзын хуваарьтай харьцуулсны дараа
            жинхэнэ сонголтоо сургуулийн албан систем дээр хийнэ.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="student-email">
              Оюутны имэйл
            </label>
            <Input
              id="student-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="23B1NUM2119@stud.num.edu.mn"
              required
            />
            <div className="mt-2 text-xs leading-5 text-zinc-500">
              Жишээ format: {emailSamples.join(" · ")}
            </div>
            <div className="mt-2 rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-500">
              Танигдсан сургууль: {detectedSchool}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="student-program">
              Мэргэжил
            </label>
            <Input
              id="student-program"
              value={program}
              onChange={(event) => setProgram(event.target.value)}
              placeholder="Жишээ: Мэдээллийн систем"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="student-year">
                Курс
              </label>
              <select
                id="student-year"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="h-10 w-full rounded-sm border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-teal-500/20"
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="student-class">
                Анги / бүлэг
              </label>
              <Input
                id="student-class"
                value={classGroup}
                onChange={(event) => setClassGroup(event.target.value)}
                placeholder="CS-2B"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Нэвтрэх
          </Button>
        </form>
      </section>
    </div>
  );
}
