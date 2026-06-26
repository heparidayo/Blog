import type {
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "Hepari's Blog",
	subtitle: "rosmontisu",
	lang: "en", // 'en', 'zh_CN', 'zh_TW', 'ja', 'ko', 'es', 'th'
	themeColor: {
		hue: 235, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		// gif 로딩 너무 느려~
		// TODO: avif 이미지 포맷으로 교체하면 될듯
		// src: "assets/images/gifRos6sLoop.gif", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		src: "assets/images/rosmontis_confront.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: true, // Display the credit text of the banner image
			text: "Arknights EP - [Confront]", // Credit text to be displayed
			url: "https://youtu.be/bu0x7pMiMIw?si=9pMTvhCj9op8TBGa", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 3, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		{
			src: "/favicon/hepari.png", // Path of the favicon, relative to the /public directory
			// theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
			sizes: "32x32", // (Optional) Size of the favicon, set only if you have favicons of different sizes
		},
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		// {
		// 	name: "GitHub",
		// 	url: "https://github.com/rosmontisu", // Internal links should not include the base path, as it is automatically added
		// 	external: true, // Show an external link icon and will open in a new tab
		// },
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/hepari.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "hepari",
	bio: "who am i..?",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/heparidayo",
		},
		{
			name: "Discord",
			icon: "fa6-brands:discord",
			url: "http://discordapp.com/users/806626814504075334",
		},
		{
			name: "Twitter",
			icon: "fa6-brands:twitter",
			url: "https://x.com/heparidayo",
		},
		{
			name: "G-Mail",
			icon: "fa6-brands:google",
			url: "mailto:heparidayo@gmail.com",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: false,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};
