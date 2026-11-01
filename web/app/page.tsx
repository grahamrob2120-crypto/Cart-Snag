const groups = ['Meat', 'Dairy', 'Vegetables', 'Fruits', 'Grains'] as const;
export default function Home() {
  return <main className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b bg-white px-5 py-4">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold tracking-widest text-green-800">G SOFTWARE DEVELOPMENTS</p><h1 className="text-3xl font-black">Cart Snag</h1></div>
        <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-900">Canada / USA</span>
      </div>
    </header>
    <div className="mx-auto max-w-6xl px-5 py-8">
      <p className="text-sm text-slate-600">Created for the people. Founded by the people. Built to serve the people.</p>
      <section aria-labelledby="deals-heading" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><p className="font-bold uppercase tracking-wide text-orange-700">Your member storefront</p><h2 id="deals-heading" className="text-3xl font-extrabold">🔥 Hottest Deals of the Day</h2></div>
          <span className="text-sm text-slate-500">Verified local grocery offers only</span>
        </div>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="font-bold">Deals are being connected</h3>
          <p className="mt-2 text-sm">No verified live retailer offers are available in this build yet. Product photos, current prices, savings and store links will appear here only after source and location verification.</p>
        </div>
      </section>
      <section aria-labelledby="categories-heading" className="mt-10">
        <h2 id="categories-heading" className="text-xl font-bold">Shop by food group</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {groups.map(group => <li key={group} className="rounded-xl border bg-white p-5 text-center font-bold shadow-sm">{group}</li>)}
        </ul>
      </section>
      <p className="mt-10 text-xs text-slate-500">Production rebuild preview. Paid access control and live pricing are not enabled. Do not deploy publicly.</p>
    </div>
  </main>;
}
