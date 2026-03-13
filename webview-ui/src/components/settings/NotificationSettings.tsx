import { HTMLAttributes } from "react" // kilocode_change
import { useAppTranslation } from "@/i18n/TranslationContext"
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"

import { SetCachedStateField } from "./types"
import { SectionHeader } from "./SectionHeader"
import { Section } from "./Section"
import { SearchableSetting } from "./SearchableSetting"
import { Slider } from "../ui"
import { vscode } from "../../utils/vscode"
import { Button } from "vscrui"

type NotificationSettingsProps = HTMLAttributes<HTMLDivElement> & {
	ttsEnabled?: boolean
	ttsSpeed?: number
	ttsPlaybackSpeed?: number // kilocode_change
	ttsVoice?: string // kilocode_change
	soundEnabled?: boolean
	soundVolume?: number
	systemNotificationsEnabled?: boolean // kilocode_change
	areSettingsCommitted?: boolean // kilocode_change
	setCachedStateField: SetCachedStateField<
		| "ttsEnabled"
		| "ttsSpeed"
		| "ttsPlaybackSpeed"
		| "ttsVoice"
		| "soundEnabled"
		| "soundVolume"
		| "systemNotificationsEnabled"
	>
}

// MiniMax TTS voice options
const TTS_VOICES = [
	{ id: "male", name: "Male (English)" },
	{ id: "female", name: "Female (English)" },
	{ id: "male_cn", name: "Male (Chinese)" },
	{ id: "female_cn", name: "Female (Chinese)" },
]

export const NotificationSettings = ({
	ttsEnabled,
	ttsSpeed,
	ttsPlaybackSpeed, // kilocode_change
	ttsVoice, // kilocode_change
	soundEnabled,
	soundVolume,
	systemNotificationsEnabled, // kilocode_change
	areSettingsCommitted, // kilocode_change
	setCachedStateField,
	...props
}: NotificationSettingsProps) => {
	const { t } = useAppTranslation()

	// kilocode_change start
	const onTestNotificationClick = () => {
		vscode.postMessage({
			type: "showSystemNotification",
			notificationOptions: {
				title: t("kilocode:settings.systemNotifications.testTitle"),
				message: t("kilocode:settings.systemNotifications.testMessage"),
			},
			alwaysAllow: true,
		})
	}
	// kilocode_change end

	return (
		<div {...props}>
			<SectionHeader>{t("settings:sections.notifications")}</SectionHeader>

			<Section>
				<SearchableSetting
					settingId="notifications-tts"
					section="notifications"
					label={t("settings:notifications.tts.label")}>
					<VSCodeCheckbox
						checked={ttsEnabled}
						onChange={(e: any) => setCachedStateField("ttsEnabled", e.target.checked)}
						data-testid="tts-enabled-checkbox">
						<span className="font-medium">{t("settings:notifications.tts.label")}</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						{t("settings:notifications.tts.description")}
					</div>
				</SearchableSetting>

				{ttsEnabled && (
					<div className="flex flex-col gap-3 pl-3 border-l-2 border-vscode-button-background">
						<SearchableSetting
							settingId="notifications-tts-speed"
							section="notifications"
							label={t("settings:notifications.tts.speedLabel")}>
							<label className="block font-medium mb-1">
								{t("settings:notifications.tts.speedLabel")}
							</label>
							<div className="flex items-center gap-2">
								<Slider
									min={0.5}
									max={3.5}
									step={0.25}
									value={[ttsPlaybackSpeed ?? 1.5]}
									onValueChange={([value]) => setCachedStateField("ttsPlaybackSpeed", value)}
									data-testid="tts-speed-slider"
								/>
								<span className="w-12">{((ttsPlaybackSpeed ?? 1.5) * 100).toFixed(0)}%</span>
							</div>
						</SearchableSetting>

						{/* Voice Selection - kilocode_change */}
						<SearchableSetting settingId="notifications-tts-voice" section="notifications" label="Voice">
							<label className="block font-medium mb-1">Voice</label>
							<select
								value={ttsVoice ?? "female"}
								onChange={(e) => setCachedStateField("ttsVoice", e.target.value)}
								className="w-full px-2 py-1 text-sm bg-vscode-input-background text-vscode-editor-foreground border border-vscode-input-border rounded">
								{TTS_VOICES.map((voice) => (
									<option key={voice.id} value={voice.id}>
										{voice.name}
									</option>
								))}
							</select>
						</SearchableSetting>
					</div>
				)}

				<SearchableSetting
					settingId="notifications-sound"
					section="notifications"
					label={t("settings:notifications.sound.label")}>
					<VSCodeCheckbox
						checked={soundEnabled}
						onChange={(e: any) => setCachedStateField("soundEnabled", e.target.checked)}
						data-testid="sound-enabled-checkbox">
						<span className="font-medium">{t("settings:notifications.sound.label")}</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						{t("settings:notifications.sound.description")}
					</div>
				</SearchableSetting>

				{soundEnabled && (
					<div className="flex flex-col gap-3 pl-3 border-l-2 border-vscode-button-background">
						<SearchableSetting
							settingId="notifications-sound-volume"
							section="notifications"
							label={t("settings:notifications.sound.volumeLabel")}>
							<label className="block font-medium mb-1">
								{t("settings:notifications.sound.volumeLabel")}
							</label>
							<div className="flex items-center gap-2">
								<Slider
									min={0}
									max={1}
									step={0.01}
									value={[soundVolume ?? 0.5]}
									onValueChange={([value]) => setCachedStateField("soundVolume", value)}
									data-testid="sound-volume-slider"
								/>
								<span className="w-10">{((soundVolume ?? 0.5) * 100).toFixed(0)}%</span>
							</div>
						</SearchableSetting>
					</div>
				)}

				{/* kilocode_change start */}
				<div>
					<VSCodeCheckbox
						checked={systemNotificationsEnabled}
						onChange={(e: any) => setCachedStateField("systemNotificationsEnabled", e.target.checked)}
						data-testid="system-notifications-enabled-checkbox">
						<span className="font-medium">{t("kilocode:settings.systemNotifications.label")}</span>
					</VSCodeCheckbox>
					<div className="text-vscode-descriptionForeground text-sm mt-1">
						{t("kilocode:settings.systemNotifications.description")}
					</div>
				</div>
				{systemNotificationsEnabled && (
					<div className="flex flex-col gap-3 pl-3 border-l-2 border-vscode-button-background">
						<Button
							className="w-fit text-vscode-button-background hover:text-vscode-button-hoverBackground"
							onClick={onTestNotificationClick}>
							{t("kilocode:settings.systemNotifications.testButton")}
						</Button>
					</div>
				)}
				{/* kilocode_change end */}
			</Section>
		</div>
	)
}
