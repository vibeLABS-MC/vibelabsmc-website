<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
</script>

<Seo title="Privacy" description="What vibeLABS stores about you, and why." />

<h1>Privacy</h1>
<p><em>Last updated 11 November 2026.</em></p>
<p>We keep as little as we can, we never sell it, and you can download or delete it yourself.</p>

<h2>What we store</h2>
<ul>
	<li>
		<strong>Your account:</strong> username, display name, bio and profile picture. With GitHub or Discord
		we store that account’s ID and name, never its access token. With email we store your address and
		an Argon2id hash of your password, never the password.
	</li>
	<li>
		<strong>Security:</strong> your signed-in devices (browser name and when it was last used), a keyed
		hash of your IP address (not the address itself), and a log of sign-ins and security changes. If you
		turn on two-factor sign-in, its secret is stored encrypted.
	</li>
	<li>
		<strong>What you publish:</strong> projects, files, screenshots, reviews, collections, follows and
		reports.
	</li>
	<li>
		<strong>Downloads:</strong> a count per project per day. We don’t keep who downloaded what.
	</li>
</ul>

<h2>Cookies</h2>
<ul>
	<li>
		<code>__Host-vl_session</code>: keeps you signed in. Secure and HttpOnly, so page scripts can’t
		read it.
	</li>
	<li><code>__Host-vl_oauth</code>: for ten minutes while you sign in with GitHub or Discord.</li>
	<li><code>vl_setup</code>: your chosen Minecraft version and loader, if you set one.</li>
	<li>Your light or dark theme is kept in your browser’s local storage.</li>
</ul>
<p>
	No advertising or tracking cookies. We use Cloudflare Web Analytics, which counts page views
	without cookies.
</p>

<h2>Who else sees data</h2>
<ul>
	<li><strong>GitHub and Discord</strong>, when you sign in with them.</li>
	<li>
		<strong>Our email provider</strong>, to send confirmation, password reset and security emails.
	</li>
	<li>
		<strong>Have I Been Pwned</strong>: when you choose a password, the first 5 characters of its
		SHA-1 hash are sent to check it against known breaches. The password itself never leaves our
		server.
	</li>
	<li><strong>Cloudflare</strong>, which carries traffic to the site.</li>
	<li>
		<strong>Moderators</strong> see what you publish and report. Only admins can see email addresses.
	</li>
</ul>

<h2>Your choices</h2>
<ul>
	<li>
		Download everything we store about you from <a href="/settings/account"
			>Settings → Account → Download my data</a
		>.
	</li>
	<li>
		Delete your account, with every project you own, from the same page. Deletion is immediate;
		database backups that still contain it expire within 14 days.
	</li>
	<li>Sign out other devices from <a href="/settings/security">Settings → Security</a>.</li>
</ul>

<h2>Contact</h2>
<p>
	Questions about your data: ask the vibeLABS team on Discord, or report your own profile with
	“Something else” and we’ll get back to you.
</p>
