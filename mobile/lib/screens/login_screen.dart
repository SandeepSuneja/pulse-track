import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_config.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../widgets/brand.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _displayName = TextEditingController();
  var _register = false;
  var _obscure = true;
  String? _formError;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _displayName.dispose();
    super.dispose();
  }

  Future<void> _google() async {
    setState(() => _formError = null);
    final auth = context.read<AuthService>();
    try {
      await auth.signInGoogle();
    } catch (_) {
      if (!mounted) return;
      setState(() => _formError = auth.error ?? 'Google sign-in failed');
    }
  }

  Future<void> _submitEmail() async {
    setState(() => _formError = null);
    final auth = context.read<AuthService>();
    try {
      if (_register) {
        await auth.registerEmail(
          _email.text,
          _password.text,
          displayName: _displayName.text,
        );
      } else {
        await auth.signInEmail(_email.text, _password.text);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _formError = auth.error ?? 'Sign-in failed');
    }
  }

  Future<void> _forgotPassword() async {
    final email = _email.text.trim();
    if (email.isEmpty) {
      setState(() => _formError = 'Enter your email above, then tap Forgot Password.');
      return;
    }
    setState(() => _formError = null);
    try {
      await FirebaseAuth.instance.sendPasswordResetEmail(email: email);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password reset email sent.')),
      );
    } on FirebaseAuthException catch (e) {
      setState(() => _formError = e.message ?? e.code);
    } catch (e) {
      setState(() => _formError = e.toString());
    }
  }

  Future<void> _dev() async {
    setState(() => _formError = null);
    final auth = context.read<AuthService>();
    try {
      await auth.signInDev();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _formError = auth.error ??
            'Dev sign-in failed. Ensure backend DEV_SKIP_AUTH=true.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final configured = auth.firebaseConfigured;

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(28, 48, 28, 28),
              children: [
                const Center(child: BrandLogo(height: 72)),
                const SizedBox(height: 16),
                Text(
                  'Pulse Track',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppTheme.primary,
                    fontSize: 34,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.8,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  _register
                      ? 'Create your account to get started.'
                      : 'Welcome back to your dashboard.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppTheme.muted,
                    fontSize: 15,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 36),
                if (!configured)
                  _Banner(
                    color: const Color(0xFFFFF7ED),
                    border: const Color(0xFFFDBA74),
                    textColor: const Color(0xFF9A3412),
                    text:
                        'Firebase is not configured. Add FIREBASE_* values matching frontend/.env.',
                  ),
                if (_formError != null) ...[
                  _Banner(
                    color: const Color(0xFFFEF2F2),
                    border: const Color(0xFFFECACA),
                    textColor: const Color(0xFF991B1B),
                    text: _formError!,
                  ),
                  const SizedBox(height: 8),
                ],
                OutlinedButton(
                  onPressed: auth.busy || !configured ? null : _google,
                  style: OutlinedButton.styleFrom(
                    backgroundColor: AppTheme.panel,
                    foregroundColor: const Color(0xFF374151),
                    side: BorderSide(color: AppTheme.line),
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                    ),
                  ),
                  child: auth.busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            GoogleMark(size: 20),
                            SizedBox(width: 10),
                            Text(
                              'Continue with Google',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                ),
                const SizedBox(height: 22),
                Row(
                  children: [
                    Expanded(child: Divider()),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 14),
                      child: Text(
                        'OR',
                        style: TextStyle(
                          color: AppTheme.muted,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ),
                    Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 22),
                if (_register) ...[
                  const _FieldLabel('Display name'),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _displayName,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      hintText: 'Your name',
                      floatingLabelBehavior: FloatingLabelBehavior.never,
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                const _FieldLabel('Email'),
                const SizedBox(height: 6),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  decoration: const InputDecoration(
                    hintText: 'name@company.com',
                    floatingLabelBehavior: FloatingLabelBehavior.never,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Expanded(child: _FieldLabel('Password')),
                    if (!_register)
                      TextButton(
                        onPressed: auth.busy ? null : _forgotPassword,
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'Forgot Password?',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _password,
                  obscureText: _obscure,
                  autofillHints: [
                    _register ? AutofillHints.newPassword : AutofillHints.password,
                  ],
                  decoration: InputDecoration(
                    hintText: '********',
                    floatingLabelBehavior: FloatingLabelBehavior.never,
                    suffixIcon: IconButton(
                      onPressed: () => setState(() => _obscure = !_obscure),
                      icon: Icon(
                        _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                        color: AppTheme.muted,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: auth.busy || !configured ? null : _submitEmail,
                  child: Text(
                    auth.busy
                        ? (_register ? 'Creating…' : 'Signing in…')
                        : (_register ? 'Create account' : 'Sign In'),
                  ),
                ),
                const SizedBox(height: 22),
                Wrap(
                  alignment: WrapAlignment.center,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      _register
                          ? 'Already have an account? '
                          : "Don't have an account? ",
                      style: TextStyle(color: AppTheme.text, fontSize: 14),
                    ),
                    TextButton(
                      onPressed: auth.busy
                          ? null
                          : () => setState(() {
                                _register = !_register;
                                _formError = null;
                              }),
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text(
                        _register ? 'Sign in' : 'Create an account',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                    ),
                  ],
                ),
                if (AppConfig.useDevAuth) ...[
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: auth.busy ? null : _dev,
                    child: Text(
                      'Continue with local demo',
                      style: TextStyle(color: AppTheme.muted),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: Color(0xFF374151),
        fontWeight: FontWeight.w600,
        fontSize: 13,
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({
    required this.color,
    required this.border,
    required this.textColor,
    required this.text,
  });

  final Color color;
  final Color border;
  final Color textColor;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(AppTheme.radius),
        border: Border.all(color: border),
      ),
      child: Text(
        text,
        style: TextStyle(color: textColor, fontSize: 13, height: 1.4),
      ),
    );
  }
}
