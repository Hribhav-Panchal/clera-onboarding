import { Link } from 'react-router-dom'
import styles from './Brand.module.css'

export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className={styles.brand} aria-label="Clera home">
      clera
    </Link>
  )
}
