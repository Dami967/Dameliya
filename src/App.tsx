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
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { SupportPage } from './pages/SupportPage';
import { BugReportPage } from './pages/BugReportPage';
import { RatePage } from './pages/RatePage';
import { FriendsPage } from './pages/FriendsPage';
import { MentorPage } from './pages/MentorPage';
import { WelcomePage } from './pages/WelcomePage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { FriendInvitePage } from './pages/FriendInvitePage';
import { ChallengeInvitePage } from './pages/ChallengeInvitePage';
import { NotesPage } from './pages/NotesPage';

const protectedPage = (Page: React.ComponentType) => () => <RequireAuth><Page /></RequireAuth>;

// Здесь живут только маршруты. Сами экраны складывай в src/pages/.
export default function App() {
  return (
    <Switch>
      <Route path="/" component={WelcomePage} />
      <Route path="/home" component={protectedPage(HomePage)} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/friends/invite/:token" component={FriendInvitePage} />
      <Route path="/challenges/invite/:token" component={ChallengeInvitePage} />
      <Route path="/quest" component={protectedPage(QuestPage)} />
      <Route path="/notes/:id" component={protectedPage(NotesPage)} />
      <Route path="/notes" component={protectedPage(NotesPage)} />
      <Route path="/task/:id" component={protectedPage(TaskPage)} />
      <Route path="/task" component={protectedPage(TaskPage)} />
      <Route path="/rewards" component={protectedPage(RewardsPage)} />
      <Route path="/profile" component={protectedPage(ProfilePage)} />
      <Route path="/profile/edit" component={protectedPage(ProfileEditPage)} />
      <Route path="/settings" component={protectedPage(SettingsPage)} />
      <Route path="/onboarding" component={protectedPage(OnboardingPage)} />
      <Route path="/privacy" component={protectedPage(PrivacyPage)} />
      <Route path="/terms" component={protectedPage(TermsPage)} />
      <Route path="/support" component={protectedPage(SupportPage)} />
      <Route path="/report-bug" component={protectedPage(BugReportPage)} />
      <Route path="/rate" component={protectedPage(RatePage)} />
      <Route path="/friends" component={protectedPage(FriendsPage)} />
      <Route path="/mentor" component={protectedPage(MentorPage)} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
