import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { ACCOUNTS_ENABLED } from '../src/lib/features';

// Support / questions inbox.
const SUPPORT_EMAIL = 'zariffdanial1@gmail.com';

function H({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}
function P({ children }: { children: ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}
function Bullet({ children }: { children: ReactNode }) {
  return (
    <View style={styles.point}>
      <Text style={styles.dot}>•</Text>
      <Text style={styles.pointText}>{children}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={16} accessibilityLabel="Back">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Privacy</Text>
        <Text style={styles.updated}>Last updated: 4 October 2026</Text>

        <P>
          Silent Support is a quiet place to check in with how you feel. This page explains, plainly,
          what we do and don’t do with your information. No legal maze, just the truth.
        </P>

        <H>What Silent Support is</H>
        <P>
          Silent Support lets you tap how you’re feeling and receive a calm, supportive response.
          Sometimes a gentle line, sometimes a breathing space. It’s built to be private and
          low-pressure. No feeds, no followers, nothing public.
        </P>

        <H>What we store</H>
        <P>We keep this as small as possible.</P>
        {ACCOUNTS_ENABLED ? (
          <>
            <Bullet>
              <Text style={styles.strong}>Your check-ins.</Text> The emotion you tap, and when. When you’re
              signed out, these are stored only on your device. (To write a response, the emotion you tapped
              and a support number from 1 to 3 pass through our server to our AI service in the moment. We
              don’t save them; see “The services we rely on”.)
            </Bullet>
            <Bullet>
              <Text style={styles.strong}>Your email.</Text> Only if you choose to sign in. Asking for a
              sign-in code creates your account, even if you don’t finish signing in. We use your email to
              send that code and to back up your check-ins. There are no passwords.
            </Bullet>
            <P>We don’t ask for your name, age, location, contacts, or anything else.</P>
          </>
        ) : (
          <>
            <Bullet>
              <Text style={styles.strong}>Your check-ins.</Text> The emotion you tap, and when. They’re
              stored only on your device. (To write a response, the emotion you tapped and a support number
              from 1 to 3 pass through our server to our AI service in the moment. We don’t save them; see
              “The services we rely on”.)
            </Bullet>
            <P>
              There’s no account to create. We don’t ask for your name, email, age, location, contacts, or
              anything else.
            </P>
          </>
        )}

        <H>How we use it</H>
        <Bullet>To show your history, so you can look back gently.</Bullet>
        {ACCOUNTS_ENABLED && (
          <Bullet>To keep it safe across your devices, only when you’re signed in.</Bullet>
        )}
        <P>We never use it to profile you or build a picture of who you are.</P>
        <P>Silent Support never knows why you chose an emotion.</P>

        <H>Gentle patterns, only on your phone</H>
        <P>
          Sometimes the app quietly notices a pattern. It might show a soft line like “you’ve been
          checking in consistently lately” (a memory whisper), or, if difficult feelings seem to be
          lasting, a gentle reminder that support resources are always there (a support nudge).
        </P>
        <P>
          Both are worked out only on your device, from check-ins already on your phone. They are never
          sent anywhere, never stored separately, and are not a diagnosis, an assessment, or any kind of
          monitoring.
        </P>

        {ACCOUNTS_ENABLED ? (
          <>
            <H>Signed out vs signed in</H>
            <Bullet>
              <Text style={styles.strong}>Signed out:</Text> no check-ins or account are stored on our
              servers, and your history stays on your device. On Android, it isn’t included in your phone’s
              backups and doesn’t move to a new phone on its own. To write a response, the emotion you tap
              and a support number from 1 to 3 are sent to our AI service in the moment. We don’t save them.
            </Bullet>
            <Bullet>
              <Text style={styles.strong}>Signed in:</Text> your check-ins are backed up to your private
              account, so they’re safe if you lose or change your phone. On a new phone, sign in to bring
              them back.
            </Bullet>
          </>
        ) : (
          <>
            <H>Your history stays on your phone</H>
            <P>
              Your history is saved only on this device, never on our servers. On Android, it also isn’t
              included in your phone’s backups and doesn’t move to a new phone on its own.
            </P>
            <P>
              Because of that, uninstalling the app, clearing its data, or losing or resetting your phone
              can erase your history for good. We don’t have a copy, so we can’t bring it back.
            </P>
            <P>
              To write a response, the emotion you tap and a support number from 1 to 3 are sent to our AI
              service in the moment. We don’t save them.
            </P>
          </>
        )}

        <H>The services we rely on</H>
        <P>We’re a small app and use a few trusted services to run:</P>
        {ACCOUNTS_ENABLED ? (
          <>
            <Bullet>
              <Text style={styles.strong}>Supabase.</Text> Handles sign-in, stores signed-in users’
              check-ins in a secure database hosted in Japan, and runs the small server step that passes the
              emotion you tap, and its support number, on to Groq without saving them. Each person’s
              check-ins are locked to their own account.
            </Bullet>
            <Bullet>
              <Text style={styles.strong}>SendGrid.</Text> Sends your sign-in code by email. It receives
              only your email address and the code, and keeps delivery records under its own policy.
            </Bullet>
          </>
        ) : (
          <Bullet>
            <Text style={styles.strong}>Supabase.</Text> Runs the small server step that passes the emotion
            you tap, and its support number, on to Groq without saving them.
          </Bullet>
        )}
        <Bullet>
          <Text style={styles.strong}>Groq.</Text> Writes some supportive responses using AI. Our
          server sends Groq the emotion you tapped and a support number from 1 to 3 that hints how much
          support to offer. That number is worked out on your phone. Your history, counts, dates, email,
          account information, and IP address aren’t included in that request. Every response starts
          with words we wrote; when you’re online, the app also asks Groq for a fresh version and shows
          it only if it arrives quickly. Groq says it doesn’t keep these requests by default, but may
          keep them for up to 30 days when it needs to fix errors or look into misuse. Its terms don’t
          allow it to train AI models on them without our permission.
        </Bullet>

        <H>Technical basics</H>
        <P>
          Like any app that connects to the internet, the services we rely on can see your device’s IP
          address (which can hint at your rough location), the time of each request, and basic technical
          details about your device, so they can deliver a response. They may keep these in technical
          logs for a limited time under their own policies. Your IP address isn’t included in the
          requests our server sends to Groq. Silent Support doesn’t use any of this to track, profile, or
          build a picture of you.
        </P>

        {ACCOUNTS_ENABLED && (
          <>
            <H>Your data is yours, and locked to you</H>
            <P>
              For signed-in users, every check-in is tied to your account. Rules in the database itself, not
              just in the app, stop other users and anyone who isn’t signed in as you from reaching it. As
              the app’s maker we have administrator access to run the service, but we don’t read your
              check-ins; they’re simply kept for you.
            </P>
          </>
        )}

        <H>Deleting your data</H>
        {ACCOUNTS_ENABLED ? (
          <>
            <Bullet>
              <Text style={styles.strong}>Signed out:</Text> clearing your history in the app removes those
              check-ins from your device.
            </Bullet>
            <Bullet>
              <Text style={styles.strong}>Signed in:</Text> clearing your history removes your check-ins
              from your account and this phone. To remove everything, go to Settings, then Account, and tap
              Delete account. This permanently removes your account and every backed-up check-in right
              away, and clears them from this device. It can’t be undone. (Signing out instead just clears
              this device and keeps your check-ins safe in your account.)
            </Bullet>
            <Bullet>
              <Text style={styles.strong}>Started signing in but didn’t finish?</Text> An account may still
              have been created for that email. Sign in once and tap Delete account, or email us and we’ll
              remove it.
            </Bullet>
          </>
        ) : (
          <P>
            In History, tap Clear history on this device to remove every check-in from your phone.
            Uninstalling the app removes them too.
          </P>
        )}

        <H>How long we keep things</H>
        {ACCOUNTS_ENABLED ? (
          <>
            <Bullet>
              Your check-ins stay until you delete them. We don’t auto-expire them or archive them
              elsewhere.
            </Bullet>
            <Bullet>
              When you clear your history while signed in, we keep only a random ID for each cleared
              check-in (never how you felt or when), so an older copy can’t bring it back. These IDs are
              removed when you delete your account.
            </Bullet>
            <Bullet>Deleting your account removes your account and every backed-up check-in.</Bullet>
          </>
        ) : (
          <Bullet>
            Your check-ins stay on your phone until you clear them or remove the app. We don’t
            auto-expire them or keep a copy anywhere else.
          </Bullet>
        )}
        <Bullet>
          The services we rely on may keep their own records for a time, under their own policies: for
          example,{' '}
          {ACCOUNTS_ENABLED
            ? 'of sign-in emails, logins, and requests to our AI service.'
            : 'of requests to our AI service.'}
        </Bullet>

        <H>What we don’t do</H>
        <Bullet>
          We don’t sell your data or share it for advertising. We only pass it to the services above so
          they can run the app.
        </Bullet>
        <Bullet>We don’t run ads.</Bullet>
        <Bullet>We don’t use tracking or analytics tools.</Bullet>
        <Bullet>We don’t have social features or anything public.</Bullet>
        <Bullet>We don’t read your check-ins for any purpose other than showing them back to you.</Bullet>
        <P>Your emotional data isn’t a product. It’s just yours.</P>

        <H>Comfort, not medicine</H>
        <P>
          Silent Support is here for comfort, not medical care or therapy, and it can’t replace a
          real person.
        </P>
        <P>
          If you’re in danger or thinking about hurting yourself, please reach out to your local
          emergency services or a helpline in the Help screen. You shouldn’t have to carry that alone.
        </P>

        <H>Questions</H>
        <P>
          If anything here is unclear, email {SUPPORT_EMAIL} and we’ll help.
        </P>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  topBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  back: {
    color: theme.colors.inkSecondary,
    fontSize: theme.typography.size.ui,
    fontFamily: theme.typography.family.sans,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 56 },
  title: {
    color: theme.colors.inkPrimary,
    fontSize: theme.typography.size.greeting,
    fontFamily: theme.typography.family.serif,
    marginTop: 12,
  },
  updated: {
    color: theme.colors.inkTertiary,
    fontSize: theme.typography.size.caption,
    fontFamily: theme.typography.family.sans,
    marginTop: 6,
    marginBottom: 20,
  },
  h2: {
    color: theme.colors.inkSecondary,
    fontSize: theme.typography.size.ui,
    fontFamily: theme.typography.family.sans,
    marginTop: 26,
    marginBottom: 8,
  },
  p: {
    color: theme.colors.inkSecondary,
    fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body,
    fontFamily: theme.typography.family.sans,
    marginBottom: 8,
  },
  point: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  dot: {
    color: theme.colors.accentWhisper,
    fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body,
  },
  pointText: {
    flex: 1,
    color: theme.colors.inkSecondary,
    fontSize: theme.typography.size.body,
    lineHeight: theme.typography.lineHeight.body,
    fontFamily: theme.typography.family.sans,
  },
  strong: { color: theme.colors.inkPrimary },
});
