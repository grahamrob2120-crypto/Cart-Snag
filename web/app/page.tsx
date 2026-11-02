import TravelCalculator from './travel-calculator';
const groups = [
  {name:'Meat',photo:'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=720&q=85',detail:'Fresh cuts and family packs'},
  {name:'Dairy',photo:'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=720&q=85',detail:'Milk, cheese and yogurt'},
  {name:'Vegetables',photo:'https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=720&q=85',detail:'Fresh vegetables'},
  {name:'Fruits',photo:'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=720&q=85',detail:'Fresh seasonal fruit'},
  {name:'Grains',photo:'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=720&q=85',detail:'Bread and pantry grains'},
] as const;
export default function Home() {
  return <main className="min-h-screen bg-[#020e40] text-white">
    <header className="border-b-4 border-[#e9b940] bg-gradient-to-r from-[#020c3d] via-[#092c8b] to-[#020c3d] px-5 py-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-bold tracking-widest text-[#f4d67b]">G SOFTWARE DEVELOPMENTS</p><h1 className="text-4xl font-black italic tracking-tight text-[#f8d76e] drop-shadow-[2px_3px_1px_#704400] sm:text-5xl">Cart Snag</h1></div>
        <p className="max-w-md text-center text-sm italic text-[#f8e4a7]">Created for the people. Founded by the people. Built to serve the people.</p>
        <span className="rounded-lg border border-[#e9b940] px-4 py-2 text-sm">Canada / USA</span>
      </div>
    </header>
    <nav className="mx-auto flex max-w-7xl flex-wrap justify-between gap-5 border-b-4 border-[#d5a735] px-5 py-4 text-sm font-bold text-[#f9e6ad]"><span>Shop by Food Group</span><span className="text-white">Hottest Deals</span><span>Beat Our Price</span><span>Grocery Prices</span><span>My Savings</span></nav>
    <div className="mx-auto max-w-7xl px-5 py-8">
      <section aria-labelledby="deals-heading" className="overflow-hidden rounded-[24px] border-4 border-[#d6a02a] bg-[radial-gradient(ellipse_at_top,#1056dc_0%,#082780_42%,#020d42_100%)] px-4 pb-8 pt-7 shadow-[0_12px_35px_rgba(0,0,0,.4)] sm:px-7">
        <h2 id="deals-heading" className="text-center font-serif text-4xl font-black italic tracking-tight text-[#ffe28b] drop-shadow-[3px_4px_2px_#06113b] sm:text-6xl">Hottest Deals of the Day</h2>
        <p className="mx-auto mt-4 max-w-2xl rounded-xl border-2 border-[#ffe7a2] bg-gradient-to-b from-[#fff2ac] via-[#ffcc39] to-[#c58709] px-5 py-3 text-center text-xl font-black uppercase tracking-wide text-[#07194d] shadow-[0_5px_0_#714500] sm:text-3xl">THE DAILY DEALS EDITION</p>
        <p className="mt-5 text-center text-sm font-semibold text-[#fff0bd]">Real grocery savings, matched to your location. We publish prices only after verification.</p><div className="mx-auto mt-6 flex max-w-4xl flex-col items-center gap-5 rounded-2xl border-2 border-[#f3ce6e] bg-[#041950]/80 p-5 text-center sm:flex-row sm:text-left"><div role="img" aria-label="Original Cart Snag raccoon mascot artwork" className="hidden aspect-[3/2] w-full max-w-[320px] shrink-0 rounded-xl border border-[#f3ce6e] bg-cover bg-center sm:block" style={{backgroundImage:"url(/cart-snag-original-mascot.webp)"}} /><div><p className="text-2xl font-black italic text-[#ffe28b] sm:text-4xl">SO CHEAP! I THOUGHT I STOLE IT!</p><p className="mt-2 text-sm text-white">Find better grocery prices without wasting money getting there.</p></div></div>
        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {groups.map(g=><article key={g.name} className="flex min-h-72 flex-col overflow-hidden rounded-2xl border-[3px] border-[#e8ba4c] bg-gradient-to-b from-white to-[#e9edf7] p-3 text-[#07194d] shadow-[0_8px_0_#5e400c,0_12px_18px_rgba(0,0,0,.35)]">
            <div className="relative h-40 overflow-hidden rounded-xl bg-[#dce3ef]"><img src={g.photo} alt={g.detail} loading="lazy" className="h-full w-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07194d]/90 to-transparent px-3 pb-2 pt-8 text-xs font-bold uppercase tracking-wider text-white">THE DAILY EDIT</div></div>
            <h3 className="mt-3 text-lg font-black">{g.name}</h3>
            <p className="mt-1 text-xs font-medium text-[#485477]">Major-chain offers • Canada & USA</p>
            <p className="mt-auto pt-5 text-base font-extrabold">Unavailable at this time</p>
            <span className="mt-3 rounded-full border border-[#f8df7c] bg-gradient-to-b from-[#fff1a4] to-[#e8ac12] px-3 py-2 text-center text-sm font-black text-[#09194c]">Awaiting live prices</span>
          </article>)}
        </div>
        <p className="mt-6 text-center text-xs text-[#f1dc9b]">Prices, discounts and store logos will appear only after verified retailer data is available. No fictional deals.</p>
      </section>
      <section id="savings-engine" aria-labelledby="savings-engine-title" className="mt-8 overflow-hidden rounded-[24px] border-[3px] border-[#e9ba4e] bg-gradient-to-br from-[#103ca2] via-[#09266c] to-[#03123e] px-5 py-8 shadow-[0_12px_28px_rgba(0,0,0,.35)] sm:px-9">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[.24em] text-[#f8d67c]">The Cart Snag advantage</p>
            <h2 id="savings-engine-title" className="mt-2 font-serif text-3xl font-black text-white sm:text-5xl">The Engine That Finds Your Real Savings</h2>
            <p className="mt-4 text-base leading-7 text-[#e5ecff]">A low shelf price isn't always the cheapest shopping trip. Cart Snag is being built to compare verified local grocery prices, account for the cost of travel, and show where your grocery budget goes further.</p>
          </div>
          <a href="#travel-calculator" className="rounded-full border-2 border-[#fff0b2] bg-gradient-to-b from-[#fff1ad] to-[#e2a820] px-6 py-3 text-center text-sm font-black text-[#07194c] shadow-[0_5px_0_#80550d]">Explore the savings calculator</a>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#d8b65a] bg-white/95 p-5 text-[#07194c]"><p className="text-xs font-black uppercase tracking-widest text-[#7e580c]">01 · Compare</p><h3 className="mt-2 text-xl font-black">Find the lowest verified price</h3><p className="mt-2 text-sm leading-6 text-[#46516a]">Compare equivalent groceries across supported major retailers, with store and location matching.</p></div>
          <div className="rounded-2xl border border-[#d8b65a] bg-white/95 p-5 text-[#07194c]"><p className="text-xs font-black uppercase tracking-widest text-[#7e580c]">02 · Calculate</p><h3 className="mt-2 text-xl font-black">Subtract the cost of getting there</h3><p className="mt-2 text-sm leading-6 text-[#46516a]">Estimate whether a farther store or a multi-store route is worth the additional travel.</p></div>
          <div className="rounded-2xl border border-[#d8b65a] bg-white/95 p-5 text-[#07194c]"><p className="text-xs font-black uppercase tracking-widest text-[#7e580c]">03 · Save</p><h3 className="mt-2 text-xl font-black">Shop to your budget</h3><p className="mt-2 text-sm leading-6 text-[#46516a]">Build a practical grocery plan with the Portion Machine, eligible coupons and verified prices when connected.</p></div>
        </div>
        <p className="mt-5 text-xs text-[#f3dda6]">Savings engine integrations are under development. No live savings results are claimed in this preview.</p>
      </section>
      <div id="travel-calculator" className="scroll-mt-6"><TravelCalculator /></div>
      <section aria-labelledby="groups-heading" className="mt-8 rounded-2xl border-t-2 border-[#d6a02a] pt-5">
        <h2 id="groups-heading" className="text-center font-serif text-3xl font-black italic text-[#ffe28b] sm:text-4xl">Shop by Food Group</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">{groups.map(g=><li key={g.name} className="rounded-2xl border-[3px] border-[#e5ae34] bg-gradient-to-b from-[#0a3caa] to-[#04144d] p-4 text-center text-lg font-bold shadow-[0_5px_0_#60410e]"><span className="block overflow-hidden rounded-xl"><img src={g.photo} alt="" loading="lazy" className="mb-3 h-24 w-full object-cover" /></span>{g.name}</li>)}</ul>
      </section>
      <section aria-label="Cart Snag membership" className="mt-8 rounded-2xl border-2 border-[#f5d77b] bg-gradient-to-r from-[#092a86] to-[#07194c] p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-[#ffe28b]">More savings. Less spending.</p>
        <h2 className="mt-2 text-3xl font-black text-white">Your grocery savings membership</h2>
        <p className="mt-3 text-6xl font-black tracking-tight text-[#ffe28b] sm:text-7xl">$0.92<span className="ml-2 text-xl font-semibold text-white">/ month</span></p><p className="mt-2 text-base font-semibold text-white">Just 92¢ a month — billed monthly</p><p className="mt-1 text-xs text-[#e9dfb7]">$0.92 charged every month. Cancel future renewals according to the subscription terms.</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[#f4e8bd]">One simple monthly membership. Built to help you compare grocery prices, plan meals around your budget, and avoid trips that cost more than they save. Features become available as verified integrations launch.</p>
        <p className="mt-5 inline-block rounded-full bg-gradient-to-b from-[#fff1a4] to-[#d89d10] px-8 py-3 text-base font-black text-[#07194c]">Membership checkout coming soon</p>
        <p className="mt-2 text-xs text-[#e3d8ad]">Subscriptions are not yet available. No payment will be collected here.</p>
      </section>
      <section aria-labelledby="giveaway-heading" className="mt-8 rounded-2xl border-2 border-[#d9ad37] bg-[#09266c] p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-[#f8d76e]">G SOFTWARE DEVELOPMENTS</p>
        <h2 id="giveaway-heading" className="mt-2 font-serif text-3xl font-bold text-[#f8d76e]">Cart Snag Loyalty Jackpot Giveaway</h2>
        <div aria-label="Every membership grows the pot" className="mt-4 flex items-center justify-center gap-2 text-4xl font-black text-[#f8d76e]"><span>P</span><span aria-label="pot of gold" role="img" className="relative inline-flex h-16 w-20 items-center justify-center rounded-[50%] border-[5px] border-[#ffe59c] bg-gradient-to-br from-[#ffefad] via-[#efb72e] to-[#9d5d0c] text-[#422608] shadow-[inset_0_3px_7px_#fff4b5,0_6px_10px_#06163c]"><span className="absolute -top-3 h-5 w-16 rounded-[50%] border-4 border-[#ffe59c] bg-[#c78313]"></span><span className="relative z-10 text-3xl font-black">$</span></span><span>T</span></div>
        <p className="mt-2 text-xl font-bold">A member-funded reward, designed to help someone who needs it.</p>
        <p className="mt-3 text-sm font-semibold text-white">Verified jackpot balance: pending payment integration</p>
        <p className="mt-2 text-sm text-[#f8e4a7]">Cart Snag membership: $0.92/month. Jackpot funding terms are under review and will be published before launch. One eligible recipient receives the available fund balance when an award is made.</p>
        <p className="mt-3 text-xs text-[#eadba7]">The live counter will activate only after verified payment, refund and allocation records are connected. Award eligibility and selection rules will be published before launch. Awards are based on eligibility and confidential hardship assessment, not a random draw. Recipient assessment is confidential, and sharing an award publicly is never required.</p>
      </section>
      <p className="mt-10 text-center text-xs text-[#d8c99d]">Development preview only. Paid access and verified retailer integrations are not active. Not approved for public launch.</p>
    </div>
  </main>;
}
