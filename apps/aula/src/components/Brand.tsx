import logoOnDark from '../assets/aula-logo-horizontal-light.png'
import logoOnLight from '../assets/aula-logo-horizontal-dark.png'
import logoMark from '../assets/aula-logo-mark.png'

export function Brand({ light = false }: { light?: boolean }) { return <div className={`brand ${light ? 'brand-light' : ''}`}><img className="brand-logo-horizontal" src={light ? logoOnDark : logoOnLight} alt="Aula Consulting"/><img className="brand-logo-compact" src={logoMark} alt="Aula Consulting"/></div> }
