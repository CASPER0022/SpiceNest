import useReveal from '../utils/useReveal';

export default function Reveal({ children, className = '', delay = 0 }) {
  const [ref, shown] = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
