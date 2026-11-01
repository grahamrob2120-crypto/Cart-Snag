import TravelCalculator from './travel-calculator';
const groups = [{name:'Meat',emoji:'🥩'},{name:'Dairy',emoji:'🧀'},{name:'Vegetables',emoji:'🥕'},{name:'Fruits',emoji:'🍎'},{name:'Grains',emoji:'🌾'}] as const;
export default function Home() {
  return <main className="min-h-screen bg-[#03164b] text-white">
    <header className="border-b-4 border-[#e9b940] bg-[#061b59] px-5 py-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-bold tracking-widest text-[#f4d67b]">G SOFTWARE DEVELOPMENTS</p><h1 className="text-4xl font-black italic tracking-tight text-[#f8d76e]">🛒 Cart Snag</h1></div>
        <p className="max-w-md text-center text-sm italic text-[#f8e4a7]">Created for the people. Founded by the people. Built to serve the people.</p>
        <span className="rounded-lg border border-[#e9b940] px-4 py-2 text-sm">Canada / USA</span>
      </div>
    </header>
    <nav className="mx-auto flex max-w-7xl flex-wrap gap-5 border-b border-[#d5a735] px-5 py-4 text-sm font-semibold text-[#f9e6ad]"><span>Shop by Food Group</span><span className="text-white">Hottest Deals</span><span>Beat Our Price</span><span>Grocery Prices</span><span>My Savings</span></nav>
    <div className="mx-auto max-w-7xl px-5 py-8">
      <section aria-labelledby="deals-heading">
        <h2 id="deals-heading" className="text-center font-serif text-4xl italic text-[#f8d76e] sm:text-6xl">🔥 Hottest Deals of the Day</h2>
        <p className="mx-auto mt-5 max-w-xl rounded-xl border border-[#f9d66e] bg-gradient-to-r from-[#b5810c] via-[#ffdc70] to-[#b5810c] px-5 py-3 text-center text-xl font-black tracking-wide text-[#071b58]">TODAY’S TOP SAVINGS</p>
        <div className="mt-7 rounded-2xl border-2 border-[#d9ad37] bg-white p-8 text-center text-[#0a235b] shadow-xl">
          <h3 className="text-2xl font-bold">Verified deals coming online</h3>
          <p className="mt-3 text-sm">Product photos, prices and savings will appear here when verified against retailer sources. No sample prices are presented as live offers.</p>
        </div>
      </section>
      <section aria-labelledby="giveaway-heading" className="mt-8 rounded-2xl border-2 border-[#d9ad37] bg-[#09266c] p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-[#f8d76e]">G SOFTWARE DEVELOPMENTS</p>
        <h2 id="giveaway-heading" className="mt-2 font-serif text-3xl font-bold text-[#f8d76e]">Community Giveaway Fund</h2>
        <p className="mt-3 text-4xl font-black text-white">Pending payment integration</p>
        <p className="mt-2 text-sm text-[#f8e4a7]">Cart Snag membership: $10.99/year. $0.99 from each eligible paid membership is allocated to the giveaway fund.</p>
        <p className="mt-3 text-xs text-[#eadba7]">The live counter will activate only after verified payment, refund and allocation records are connected. Giveaway eligibility, rules and entry methods will be published before launch.</p>
      </section>
      <TravelCalculator />
      <section aria-labelledby="groups-heading" className="mt-12">
        <h2 id="groups-heading" className="text-center font-serif text-3xl font-bold text-[#f8d76e]">Shop by Food Group</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">{groups.map(g=><li key={g.name} className="rounded-xl border-2 border-[#d9ad37] bg-[#09266c] p-4 text-center text-lg font-semibold"><span aria-hidden="true">{g.emoji}</span> {g.name}</li>)}</ul>
      </section>
      <p className="mt-10 text-center text-xs text-[#d8c99d]">Development preview only. Paid access and verified retailer integrations are not active. Not approved for public launch.</p>
    </div>
  </main>;
}
