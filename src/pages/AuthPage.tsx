import { Link, useLocation } from 'wouter';
import { Auth } from '../components/Auth';
import { Icon } from '../components/Icon';

export function AuthPage() {
  const params = new URLSearchParams(window.location.search);
  const initialMode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const [, navigate] = useLocation();

  return (
    <main className="auth-page">
      <section className="auth-showcase">
        <Link href="/" className="brand brand--light">
          <span className="brand__mark"><Icon name="star" size={20} /></span>
          <span>GoalQuest</span>
        </Link>
        <div className="auth-showcase__copy">
          <span className="auth-kicker">ТВОЙ ПУТЬ. ТВОИ ПРАВИЛА.</span>
          <h1>Превращай цели<br />в приключения.</h1>
          <p>Персональный AI-наставник поможет двигаться маленькими шагами и замечать каждый успех.</p>
        </div>
        <img src="/goalquest-eagle-quest.png" alt="" className="auth-eagle" />
      </section>
      <section className="auth-panel">
        <Auth initialMode={initialMode} onSuccess={(isNew) => navigate(isNew ? '/onboarding' : '/')} />
      </section>
    </main>
  );
}
