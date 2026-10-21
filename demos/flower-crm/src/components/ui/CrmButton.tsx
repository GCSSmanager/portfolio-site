import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import './crm-button.css'

/** Визуальный пресет кнопки (см. crm-button.css). */
export type CrmButtonVariant =
  | 'add'
  | 'primary'
  | 'ghost'
  | 'danger'
  | 'accent'
  | 'link'
  | 'empty'
  | 'emptySecondary'
  | 'loginPrimary'
  | 'loginSecondary'
  | 'loginReset'
  | 'landingAuth'
  | 'landingCta'
  | 'notFound'
  | 'tasksLink'
  | 'tasksLinkDanger'
  | 'flowersHead'
  | 'flowersHeadPrimary'
  | 'staffSubmit'
  | 'staffChip'
  | 'staffChipDanger'
  | 'homeTaskPrimary'
  | 'homeTaskGhost'
  | 'rowEdit'
  | 'rowDel'
  | 'intake'
  | 'basicCare'
  | 'iconAct'
  | 'homeHead'
  | 'collapsibleTitle'
  | 'taxonDd'
  | 'pickField'
  | 'wasteDiscard'
  | 'suppliersPlan'
  | 'suppliersCardPlan'
  | 'suppliersOfferAdd'
  | 'expensesSectionAdd'
  | 'expensesRowPay'
  | 'deliveryLineRemove'
  | 'deliveryLineAdd'
  | 'storeFlowersClearCatalog'
  | 'tasksModalDel'
  | 'flowersTreeToggle'
  | 'flowersTreeGuideH'
  | 'flowersTreeGuideV'
  | 'statsSort'
  | 'statsTableToggle'
  | 'inventoryHistoryHead'
  | 'custom'

export type CrmHomeHeadAction =
  | 'delivery'
  | 'intake'
  | 'bouquet'
  | 'retail'
  | 'sale'
  | 'order'
  | 'waste'
  | 'inventory'

export type CrmIconActTone = 'trim' | 'water' | 'care' | 'discard'

const VARIANT_CLASS: Record<
  Exclude<CrmButtonVariant, 'custom' | 'homeHead' | 'iconAct' | 'intake' | 'basicCare' | 'danger'>,
  string
> = {
  add: 'crm-btn--add',
  primary: 'crm-btn--primary',
  ghost: 'crm-btn--ghost',
  accent: 'crm-btn--accent',
  link: 'crm-btn--link',
  empty: 'crm-btn--empty',
  emptySecondary: 'crm-btn--empty crm-btn--empty-secondary',
  loginPrimary: 'crm-btn--login-primary',
  loginSecondary: 'crm-btn--login-secondary',
  loginReset: 'crm-btn--login-reset',
  landingAuth: 'crm-btn--landing-auth',
  landingCta: 'crm-btn--landing-cta',
  notFound: 'crm-btn--not-found',
  tasksLink: 'crm-btn--tasks-link',
  tasksLinkDanger: 'crm-btn--tasks-link crm-btn--tasks-link-danger',
  flowersHead: 'crm-btn--flowers-head',
  flowersHeadPrimary: 'crm-btn--flowers-head crm-btn--flowers-head-primary',
  staffSubmit: 'crm-btn--staff-submit',
  staffChip: 'crm-btn--staff-chip',
  staffChipDanger: 'crm-btn--staff-chip crm-btn--staff-chip-danger',
  homeTaskPrimary: 'crm-btn--home-task-primary',
  homeTaskGhost: 'crm-btn--home-task-ghost',
  rowEdit: 'crm-btn--icon-close crm-btn--row-edit',
  rowDel: 'crm-btn--icon-close crm-btn--row-del',
  collapsibleTitle: 'crm-btn--collapsible-title',
  taxonDd: 'crm-btn--taxon-dd',
  pickField: 'crm-btn--pick',
  wasteDiscard: 'crm-btn--primary crm-btn--waste-discard',
  suppliersPlan: 'crm-btn--suppliers-plan',
  suppliersCardPlan: 'crm-btn--suppliers-card-plan',
  suppliersOfferAdd: 'crm-btn--suppliers-offer-add',
  expensesSectionAdd: 'crm-btn--expenses-section-add',
  expensesRowPay: 'crm-btn--ghost crm-btn--expenses-pay',
  deliveryLineRemove: 'crm-btn--line-remove',
  deliveryLineAdd: 'crm-btn--ghost crm-btn--line-add',
  storeFlowersClearCatalog: 'crm-btn--clear-catalog',
  tasksModalDel: 'crm-btn--tasks-modal-del',
  flowersTreeToggle: 'crm-btn--tree-toggle',
  flowersTreeGuideH: 'crm-btn--tree-guide-h',
  flowersTreeGuideV: 'crm-btn--tree-guide-v',
  statsSort: 'crm-btn--stats-sort',
  statsTableToggle: 'crm-btn--stats-toggle',
  inventoryHistoryHead: 'crm-btn--inventory-head',
}

function buildClassName(
  variant: CrmButtonVariant,
  opts: {
    className?: string
    homeAction?: CrmHomeHeadAction
    iconTone?: CrmIconActTone
    iconOnly?: boolean
    fullWidth?: boolean
  },
): string {
  const { className, homeAction, iconTone, iconOnly, fullWidth } = opts
  const parts: string[] = ['crm-btn']

  if (variant === 'custom') {
    if (className) parts.push(className)
    return parts.join(' ')
  }

  if (variant === 'danger') {
    parts.push('crm-btn--ghost', 'crm-btn--danger')
  } else if (variant === 'homeHead') {
    parts.push('crm-btn--home-head')
    if (homeAction) parts.push(`crm-btn--home-${homeAction}`)
  } else if (variant === 'intake') {
    parts.push('crm-btn--intake')
  } else if (variant === 'basicCare') {
    parts.push('crm-btn--basic-care')
    if (iconOnly) parts.push('crm-btn--basic-care-icon-only')
  } else if (variant === 'iconAct') {
    parts.push('crm-btn--icon-act')
    if (iconTone) parts.push(`crm-btn--icon-${iconTone}`)
  } else {
    parts.push(VARIANT_CLASS[variant])
  }

  if (fullWidth) parts.push('crm-btn--full')
  if (className) parts.push(className)
  return parts.filter(Boolean).join(' ')
}

type CrmButtonProps = {
  variant?: CrmButtonVariant
  homeAction?: CrmHomeHeadAction
  iconTone?: CrmIconActTone
  iconOnly?: boolean
  fullWidth?: boolean
  icon?: ReactNode
  to?: string
  linkState?: LinkProps['state']
  children?: ReactNode
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>

function renderHomeHeadContent(icon: ReactNode | undefined, children: ReactNode) {
  return (
    <>
      {icon != null ? (
        <span className="crm-btn__ico" aria-hidden>
          {icon}
        </span>
      ) : null}
      {children != null ? <span className="crm-btn__txt">{children}</span> : null}
    </>
  )
}

export const CrmButton = forwardRef<HTMLButtonElement, CrmButtonProps>(function CrmButton(
  {
    variant = 'add',
    homeAction,
    iconTone,
    iconOnly,
    fullWidth,
    icon,
    to,
    linkState,
    children,
    className,
    type = 'button',
    ...rest
  },
  ref,
) {
  const cls = buildClassName(variant, { className, homeAction, iconTone, iconOnly, fullWidth })
  const content = variant === 'homeHead' ? renderHomeHeadContent(icon, children) : (
    <>
      {icon}
      {children}
    </>
  )

  if (to != null) {
    return (
      <Link to={to} state={linkState} className={cls} title={rest.title} aria-label={rest['aria-label']}>
        {content}
      </Link>
    )
  }

  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {content}
    </button>
  )
})
