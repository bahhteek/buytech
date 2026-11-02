import { Link } from 'react-router-dom'
import { machinePath } from '../categorySlug'
import { useSite } from '../context/SiteContext'
import type { Machine } from '../types'
import { machineCover } from '../types'

type MachineCardProps = {
  machine: Machine
}

export function MachineCard({ machine }: MachineCardProps) {
  const { categories, machines } = useSite()
  const href = machinePath(machine, categories, machines)
  return (
    <article className="machine">
      <Link className="machine-link" to={href}>
        <span className="machine-photo">
          <img src={machineCover(machine)} alt="" />
          {machine.condition ? <span className="machine-badge">{machine.condition}</span> : null}
        </span>
        <span className="machine-body">
          <span className="machine-top">
            {machine.brand ? <span className="machine-tag">{machine.brand}</span> : null}
            <span className="machine-type">{machine.category}</span>
          </span>
          <h3>{machine.name}</h3>
          <span className="machine-foot">
            <span className="machine-year">{machine.year}</span>
            <strong>{machine.price}</strong>
          </span>
        </span>
      </Link>
    </article>
  )
}
