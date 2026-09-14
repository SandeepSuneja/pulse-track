import { Link as RouterLink } from 'react-router-dom'
import { Box, Link, Stack, Typography } from '@mui/material'

const pageBg = {
  minHeight: '100vh',
  p: { xs: 2.5, md: 4 },
  background: `
    radial-gradient(900px 480px at 10% 0%, rgba(34,211,238,0.14), transparent 55%),
    radial-gradient(700px 400px at 90% 100%, rgba(14,165,233,0.1), transparent 50%),
    #060B14
  `,
}

function Section({ title, children }) {
  return (
    <Box component="section" sx={{ mb: 3 }}>
      <Typography
        component="h2"
        sx={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 700,
          fontSize: '1.05rem',
          color: '#E8F1FF',
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Stack spacing={1.25} sx={{ color: '#8BA3C7', fontSize: '0.95rem', lineHeight: 1.55 }}>
        {children}
      </Stack>
    </Box>
  )
}

export default function Privacy() {
  return (
    <Box sx={pageBg}>
      <Box sx={{ width: 'min(720px, 100%)', mx: 'auto' }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: 11,
              color: '#041018',
              background: 'linear-gradient(145deg, #67E8F9, #0891B2)',
            }}
          >
            PT
          </Box>
          <Box>
            <Typography
              sx={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                color: '#F0F7FF',
                lineHeight: 1.2,
              }}
            >
              Pulse Track
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(103,232,249,0.75)' }}>
              Privacy Policy
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            borderRadius: '16px',
            p: { xs: 2.5, sm: 3.5 },
            bgcolor: '#0D1624',
            border: '1px solid rgba(34,211,238,0.16)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              letterSpacing: '-0.03em',
              color: '#E8F1FF',
              mb: 0.75,
            }}
          >
            Privacy Policy
          </Typography>
          <Typography sx={{ color: '#8BA3C7', mb: 3, fontSize: '0.9rem' }}>
            Last updated: September 15, 2026
          </Typography>

          <Section title="Overview">
            <Typography component="p">
              Pulse Track is a personal productivity app for planned work, time logs, goals, sleep
              tracking, and progress charts. This policy explains what information we collect, how
              we use it, and your choices. By using Pulse Track (web or mobile), you agree to this
              policy.
            </Typography>
          </Section>

          <Section title="Information we collect">
            <Typography component="p">
              <strong style={{ color: '#E8F1FF' }}>Account information.</strong> When you sign in
              with Google or email/password via Firebase Authentication, we receive identifiers such
              as your email address and display name.
            </Typography>
            <Typography component="p">
              <strong style={{ color: '#E8F1FF' }}>Profile data.</strong> Optional profile fields you
              provide in the app, such as display name, timezone, and bio.
            </Typography>
            <Typography component="p">
              <strong style={{ color: '#E8F1FF' }}>App content you create.</strong> Tasks, activity
              logs (including sleep start/wake times and quality), goals, linked tasks, notes, and
              related timestamps needed to run the product.
            </Typography>
            <Typography component="p">
              <strong style={{ color: '#E8F1FF' }}>Technical data.</strong> Basic operational data
              required to secure and operate the service (for example authentication tokens and
              server logs used for reliability and abuse prevention).
            </Typography>
          </Section>

          <Section title="How we use information">
            <Typography component="p">We use this information to:</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              <li>Provide, sync, and improve Pulse Track across web and mobile</li>
              <li>Show your board, activities, goals, dashboard, and analytics</li>
              <li>Authenticate you and protect your account</li>
              <li>Respond to support or privacy requests</li>
            </Box>
            <Typography component="p">
              We do not sell your personal information. We do not use your task or activity content
              for third-party advertising.
            </Typography>
          </Section>

          <Section title="Third-party services">
            <Typography component="p">Pulse Track relies on:</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              <li>
                <strong style={{ color: '#E8F1FF' }}>Google Firebase Authentication</strong> —
                account sign-in (email/password and Google Sign-In)
              </li>
              <li>
                <strong style={{ color: '#E8F1FF' }}>Google Sign-In</strong> — if you choose to
                continue with Google
              </li>
              <li>
                <strong style={{ color: '#E8F1FF' }}>Cloud hosting (AWS)</strong> — API and database
                hosting for app data
              </li>
            </Box>
            <Typography component="p">
              Those providers process data under their own terms and privacy policies when you use
              their sign-in or when we host your app data with them.
            </Typography>
          </Section>

          <Section title="Data retention and deletion">
            <Typography component="p">
              We keep your account and app data while your account remains active so the product can
              function. You may request deletion of your account and associated app data by
              contacting us. Some limited records may remain for a short period in backups or logs
              needed for security and legal compliance.
            </Typography>
          </Section>

          <Section title="Children">
            <Typography component="p">
              Pulse Track is not directed to children under 13, and we do not knowingly collect
              personal information from children under 13.
            </Typography>
          </Section>

          <Section title="Changes">
            <Typography component="p">
              We may update this policy from time to time. The “Last updated” date at the top will
              change when we do. Continued use of Pulse Track after an update means you accept the
              revised policy.
            </Typography>
          </Section>

          <Section title="Contact">
            <Typography component="p">
              For privacy questions or deletion requests, contact the app operator using the support
              email listed on the Pulse Track Google Play listing, or the contact email associated
              with your Pulse Track developer account.
            </Typography>
          </Section>
        </Box>

        <Typography sx={{ mt: 2.5, textAlign: 'center', color: '#8BA3C7', fontSize: '0.9rem' }}>
          <Link component={RouterLink} to="/login" underline="hover" fontWeight={700}>
            Back to sign in
          </Link>
        </Typography>
      </Box>
    </Box>
  )
}
