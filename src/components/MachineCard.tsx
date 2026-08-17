import { Link } from 'react-router-dom'
import type { Machine } from '../types'
import { machineCover } from '../types'

type MachineCardProps = {
  machine: Machine
}

export function MachineCard({ machine }: MachineCardProps) {
  return (
    <article className="machine">
      <Link className="machine-photo" to={`/catalog/${machine.id}`}>
        <img src={machineCover(machine)} alt={machine.name} />
        <span className="machine-badge">{machine.condition}</span>
      </Link>
      <div className="machine-body">
        <div className="machine-top">
          <span className="machine-tag">{machine.brand}</span>
          <span className="machine-type">{machine.category}</span>
        </div>
        <h3>
          <Link to={`/catalog/${machine.id}`}>{machine.name}</Link>
        </h3>
        <dl className="machine-specs">
          <div>
            <dt>Год</dt>
            <dd>{machine.year}</dd>
          </div>
          <div>
            <dt>Статус</dt>
            <dd>{machine.condition}</dd>
          </div>
        </dl>
        <div className="machine-foot">
          <strong>{machine.price}</strong>
          <Link to={`/catalog/${machine.id}`}>Подробнее</Link>
        </div>
      </div>
    </article>
  )
}
