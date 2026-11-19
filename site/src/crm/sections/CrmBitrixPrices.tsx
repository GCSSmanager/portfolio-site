import { PhoneLeadForm } from '@/components/crm/PhoneLeadForm'
import { BITRIX_PRICE_ITEMS, bitrixPriceLabel, type BitrixPriceItem } from '@/data/crm-bitrix-prices'

const priceSplit = Math.ceil(BITRIX_PRICE_ITEMS.length / 2)
const priceColumns: BitrixPriceItem[][] = [
  BITRIX_PRICE_ITEMS.slice(0, priceSplit),
  BITRIX_PRICE_ITEMS.slice(priceSplit),
]

export function CrmBitrixPrices() {
  return (
    <section className="crm-pricing" id="pricing" aria-labelledby="crm-pricing-title">
      <div className="container">
        <div className="section__head">
          <p className="section__eyebrow">Стоимость</p>
          <h2 className="section__title" id="crm-pricing-title">
            Платите только за нужное
          </h2>
        </div>

        <div className="crm-bitrix-prices">
          {priceColumns.map((column) => (
            <ul key={column[0]?.id} className="crm-bitrix-prices__col">
              {column.map((item) => (
                <li key={item.id} className="crm-bitrix-prices__row">
                  <p className="crm-bitrix-prices__name">
                    {item.name}
                    {item.detail ? <span className="crm-bitrix-prices__detail">{item.detail}</span> : null}
                  </p>
                  <p className="crm-bitrix-prices__sum">
                    {bitrixPriceLabel(item)}
                    {item.note ? <span className="crm-bitrix-prices__note">{item.note}</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          ))}
        </div>

        <div className="crm-pricing__foot crm-pricing__foot--compact">
          <PhoneLeadForm
            leadName="Цены Битрикс и amoCRM"
            leadSource="bitrix-pricing"
            submitLabel="Оценить задачу"
            phoneLeadId="bitrix-pricing-phone"
            phoneLeadClass="crm-pricing__send"
            phoneLeadBtnClass="crm-pricing__cta"
            phoneLeadDealBtn
            phoneInputClassName="crm-pricing__phone"
            errorClassName="crm-pricing__error"
            doneClassName="crm-pricing__done"
          />
        </div>
      </div>
    </section>
  )
}
