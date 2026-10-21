export function CrmSkeleton() {
  return (
    <div className="crm-skeleton" aria-busy="true" aria-label="Загрузка">
      {[1, 2, 3, 4, 5, 6].map((k) => (
        <div key={k} className="crm-skeleton__card" />
      ))}
    </div>
  )
}
