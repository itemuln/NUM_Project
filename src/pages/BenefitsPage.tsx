import { FormEvent, useState } from "react";
import { BadgePercent, BookOpen, EyeOff, Send, ShieldCheck, ShoppingBag, TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScheduleStore } from "@/hooks/useSchedule";

const couponDeals = [
  {
    id: "coupon-cafe",
    title: "Оюутны кофе багц",
    partner: "Campus Cafe",
    discount: "20%",
    note: "Сургуулийн имэйлээр баталгаажсан хэрэглэгчдэд"
  },
  {
    id: "coupon-print",
    title: "Хэвлэлтийн эрх",
    partner: "Print Hub",
    discount: "15%",
    note: "Бие даалт, постер, CV хэвлэхэд"
  },
  {
    id: "coupon-cowork",
    title: "Багийн ажлын өрөө",
    partner: "Study Room",
    discount: "30%",
    note: "Нийтлэг сул цаг олсон багт санал болгоно"
  }
];

export function BenefitsPage() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const currentStudent = useScheduleStore((state) => state.currentStudent);
  const marketplaceItems = useScheduleStore((state) => state.marketplaceItems);
  const buyRequests = useScheduleStore((state) => state.buyRequests);
  const addMarketplaceItem = useScheduleStore((state) => state.addMarketplaceItem);
  const sendBuyRequest = useScheduleStore((state) => state.sendBuyRequest);

  const submitProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addMarketplaceItem({ title, price, condition, location, description });
    setTitle("");
    setPrice("");
    setCondition("");
    setLocation("");
    setDescription("");
  };

  const myRequests = buyRequests.filter((request) => request.buyer_id === currentStudent.id);
  const receivedRequests = buyRequests.filter((request) => request.seller_id === currentStudent.id);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden sm:gap-4">
      <header className="shrink-0 border border-zinc-200 bg-white px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Student benefits</div>
        <h1 className="mt-1 text-xl font-semibold text-zinc-950">Ашиг тус ба оюутны marketplace</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          Хуваарь төлөвлөлтөөс гадна оюутанд хэрэгтэй coupon, sale, хэрэглэсэн ном болон хэрэгслийн anonymous заруудыг
          нэг дор харуулна.
        </p>
      </header>

      <div className="scheduler-scrollbar min-h-0 flex-1 overflow-auto pr-1">
        <div className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-3">
            {couponDeals.map((deal) => (
              <article key={deal.id} className="border border-zinc-200 bg-white p-4 transition-transform duration-200 hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{deal.partner}</div>
                    <h2 className="mt-2 text-lg font-semibold text-zinc-950">{deal.title}</h2>
                  </div>
                  <div className="inline-flex h-12 w-12 items-center justify-center border border-teal-500/40 bg-teal-500/10 text-teal-200">
                    <TicketPercent className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 text-3xl font-semibold text-zinc-950">{deal.discount}</div>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{deal.note}</p>
              </article>
            ))}
          </section>

          <section className="grid min-h-0 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Anonymous marketplace</div>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-950">Хэрэглэсэн ном, хэрэгсэл зарах</h2>
                </div>
                <ShoppingBag className="h-5 w-5 text-zinc-400" />
              </div>

              <form onSubmit={submitProduct} className="mt-4 grid gap-3 border border-zinc-200 bg-zinc-50 p-3 lg:grid-cols-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Барааны нэр" required />
            <Input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Үнэ: 35,000₮" required />
            <Input value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="Төлөв: сайн / дунд" required />
            <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Байршил" required />
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="lg:col-span-2"
              placeholder="Тайлбар"
            />
            <Button type="submit" className="lg:col-span-2">
              <ShoppingBag className="h-4 w-4" />
              Anonymous product post хийх
            </Button>
              </form>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {marketplaceItems.map((item) => (
              <article key={item.id} className="border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-950">{item.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">{item.condition} · {item.location}</div>
                  </div>
                  <div className="text-sm font-semibold text-zinc-950">{item.price}</div>
                </div>
                {item.description && <p className="mt-2 text-xs leading-5 text-zinc-500">{item.description}</p>}
                <div className="mt-3 inline-flex items-center gap-1 border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <EyeOff className="h-3.5 w-3.5" />
                  {item.anonymousSeller}
                </div>
                <div className="mt-3">
                  {item.seller_id === currentStudent.id ? (
                    <div className="border border-zinc-200 bg-white px-2 py-2 text-xs font-medium text-zinc-500">
                      Таны оруулсан зар
                    </div>
                  ) : myRequests.some((request) => request.item_id === item.id) ? (
                    <div className="border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-800">
                      Buy request илгээгдсэн
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => sendBuyRequest(item.id, "")}>
                      <Send className="h-3.5 w-3.5" />
                      Buy request илгээх
                    </Button>
                  )}
                </div>
              </article>
            ))}
              </div>
            </div>

            <aside className="border border-zinc-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Privacy rule</div>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">Нэр нууцлалтай зар</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-500">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              Худалдагчийн бодит нэр public UI дээр харагдахгүй.
            </div>
            <div className="flex gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-teal-500" />
              Ном, хичээлийн тэмдэглэл, calculator зэрэг оюутанд хэрэгтэй зүйлсийг дэмжинэ.
            </div>
            <div className="flex gap-3">
              <BadgePercent className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
              Дараагийн шатанд coupon болон marketplace-г community-тэй холбож санал болгоно.
            </div>
          </div>

          <div className="mt-5 border-t border-zinc-200 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Buy requests</div>
            <div className="mt-3 space-y-2">
              {receivedRequests.map((request) => {
                const item = marketplaceItems.find((marketplaceItem) => marketplaceItem.id === request.item_id);

                return (
                  <div key={request.id} className="border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="text-sm font-semibold text-zinc-950">{item?.title ?? "Зар устсан"}</div>
                    <div className="mt-1 text-xs text-zinc-500">{request.message}</div>
                    <div className="mt-2 inline-flex border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {request.status}
                    </div>
                  </div>
                );
              })}
              {receivedRequests.length === 0 && (
                <div className="border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
                  Таны зар дээр buy request ирээгүй байна.
                </div>
              )}
            </div>
          </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}
