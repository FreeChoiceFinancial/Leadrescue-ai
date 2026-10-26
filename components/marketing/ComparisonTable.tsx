import { CitationList } from "@/components/marketing/CitationList";
import { COMPARISON_ATTRIBUTES, COMPARISON_COLUMNS, COMPARED_AS_OF } from "@/lib/marketing/trust";

export function ComparisonTable() {
  return (
    <div>
      <div className="overflow-x-auto rounded-3xl border border-ink/10">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <caption className="sr-only">LeadRescue compared with Podium, Hatch, and HighLevel on published pricing and product facts</caption>
          <thead className="bg-cream">
            <tr>
              <th scope="col" className="px-4 py-4 font-semibold">
                Topic
              </th>
              {COMPARISON_COLUMNS.map((column) => (
                <th key={column.id} scope="col" className="min-w-[220px] px-4 py-4 align-bottom">
                  <span className="block font-display text-2xl">{column.name}</span>
                  <span className="mt-1 block text-xs font-normal leading-relaxed text-ink/60">{column.note}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ATTRIBUTES.map(([key, label]) => (
              <tr key={key} className="border-t border-ink/10 align-top">
                <th scope="row" className="bg-paper px-4 py-4 font-semibold">
                  {label}
                </th>
                {COMPARISON_COLUMNS.map((column) => {
                  const fact = column.facts[key];
                  return (
                    <td key={column.id} className="px-4 py-4 leading-relaxed text-ink/80">
                      <p>{fact.text}</p>
                      <p className="mt-2 text-xs text-ink/55">
                        <CitationList sources={fact.sources} />
                      </p>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-ink/60">{COMPARED_AS_OF} Links go to each company’s public page. This table does not include reviews or results from customers.</p>
    </div>
  );
}
