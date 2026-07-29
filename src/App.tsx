import { Route, Switch } from 'wouter';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { QuestPage } from './pages/QuestPage';
import { TaskPage } from './pages/TaskPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AuthPage } from './pages/AuthPage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { SettingsPage } from './pages/SettingsPage';
import { RewardsPage } from './pages/RewardsPage';
import { RequireAuth } from './components/RequireAuth';

const protectedPage = (Page: React.ComponentType) => () => <RequireAuth><Page /></RequireAuth>;

// Здесь живут только маршруты. Сами экраны складывай в src/pages/.
export default function App() {
  return (
    <Switch>
      <Route path="/" component={protectedPage(HomePage)} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/quest" component={protectedPage(QuestPage)} />
      <Route path="/task" component={protectedPage(TaskPage)} />
      <Route path="/rewards" component={protectedPage(RewardsPage)} />
      <Route path="/profile" component={protectedPage(ProfilePage)} />
      <Route path="/profile/edit" component={protectedPage(ProfileEditPage)} />
      <Route path="/settings" component={protectedPage(SettingsPage)} />
      <Route path="/onboarding" component={protectedPage(OnboardingPage)} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
