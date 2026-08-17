type ProfileUser = {
	id: string;
	username: string;
	role: 'admin' | 'user';
	email?: string;
	name?: string;
	alias?: string;
	profilePhoto?: string;
	authProvider?: 'local' | 'google';
};

const profileDialog = document.querySelector<HTMLDialogElement>('#profile-dialog')!;
const profileForm = document.querySelector<HTMLFormElement>('#profile-form')!;
const openProfileButton = document.querySelector<HTMLButtonElement>('#open-profile-dialog')!;
const closeProfileButton = document.querySelector<HTMLButtonElement>('#close-profile-dialog')!;
const cancelProfileButton = document.querySelector<HTMLButtonElement>('#cancel-profile')!;
const saveProfileButton = document.querySelector<HTMLButtonElement>('#save-profile')!;
const profileMessage = document.querySelector<HTMLDivElement>('#profile-message')!;
const profileEmail = document.querySelector<HTMLInputElement>('#profile-email')!;
const profileName = document.querySelector<HTMLInputElement>('#profile-name')!;
const profileAlias = document.querySelector<HTMLInputElement>('#profile-alias')!;
const profileCurrentPassword = document.querySelector<HTMLInputElement>('#profile-current-password');
const profileNewPassword = document.querySelector<HTMLInputElement>('#profile-new-password');
const profilePhotoInput = document.querySelector<HTMLInputElement>('#profile-photo-input')!;
const profilePhotoPreview = document.querySelector<HTMLDivElement>('#profile-photo-preview')!;
const removeProfilePhoto = document.querySelector<HTMLButtonElement>('#remove-profile-photo')!;
const userMenuName = document.querySelector<HTMLElement>('#user-menu-name')!;
const userMenuEmail = document.querySelector<HTMLElement>('#user-menu-email')!;
const userAvatar = document.querySelector<HTMLElement>('.user-dropdown .avatar')!;
const extensionDialog = document.querySelector<HTMLDialogElement>('#extension-dialog')!;
const openExtensionButton = document.querySelector<HTMLButtonElement>('#open-extension-dialog')!;
const closeExtensionButton = document.querySelector<HTMLButtonElement>('#close-extension-dialog')!;
const cancelExtensionButton = document.querySelector<HTMLButtonElement>('#cancel-extension')!;

function initials(value: string) {
	return value.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('es')).join('') || 'RB';
}

function displayName(user: ProfileUser) {
	return user.alias?.trim() || user.name?.trim() || user.username;
}

function setMessage(message = '', isError = false) {
	profileMessage.hidden = !message;
	profileMessage.textContent = message;
	profileMessage.classList.toggle('is-error', isError);
}

function renderPhoto(user: ProfileUser) {
	const name = displayName(user);
	profilePhotoPreview.replaceChildren();
	userAvatar.replaceChildren();
	if (user.profilePhoto) {
		const preview = document.createElement('img');
		preview.src = user.profilePhoto;
		preview.alt = 'Foto de perfil';
		profilePhotoPreview.append(preview);
		const avatar = document.createElement('img');
		avatar.id = 'header-profile-photo';
		avatar.src = user.profilePhoto;
		avatar.alt = '';
		userAvatar.append(avatar);
	} else {
		profilePhotoPreview.append(Object.assign(document.createElement('span'), { textContent: initials(name) }));
		userAvatar.append(Object.assign(document.createElement('span'), { id: 'header-profile-initials', textContent: initials(name) }));
	}
	removeProfilePhoto.hidden = !user.profilePhoto;
}

function renderProfile(user: ProfileUser) {
	profileEmail.value = user.email || '';
	profileName.value = user.name || user.username;
	profileAlias.value = user.alias || '';
	userMenuName.textContent = displayName(user);
	userMenuEmail.textContent = user.email || (user.username.includes('@') ? user.username : '');
	renderPhoto(user);
}

async function readProfile() {
	const response = await fetch('/api/profile');
	const result = await response.json() as { user?: ProfileUser; error?: string };
	if (!response.ok || !result.user) throw new Error(result.error || 'No se pudo cargar el perfil');
	renderProfile(result.user);
}

openProfileButton.addEventListener('click', async () => {
	openProfileButton.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
	setMessage();
	if (profileCurrentPassword) profileCurrentPassword.value = '';
	if (profileNewPassword) profileNewPassword.value = '';
	profileDialog.showModal();
	try { await readProfile(); }
	catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo cargar el perfil', true); }
});

closeProfileButton.addEventListener('click', () => profileDialog.close());
cancelProfileButton.addEventListener('click', () => profileDialog.close());

profileForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	saveProfileButton.disabled = true;
	setMessage();
	try {
		const response = await fetch('/api/profile', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				email: profileEmail.value,
				name: profileName.value,
				alias: profileAlias.value,
				currentPassword: profileCurrentPassword?.value || '',
				newPassword: profileNewPassword?.value || '',
			}),
		});
		const result = await response.json() as { user?: ProfileUser; error?: string };
		if (!response.ok || !result.user) throw new Error(result.error || 'No se pudo guardar el perfil');
		renderProfile(result.user);
		setMessage('Perfil actualizado correctamente.');
		if (profileCurrentPassword) profileCurrentPassword.value = '';
		if (profileNewPassword) profileNewPassword.value = '';
	} catch (error) {
		setMessage(error instanceof Error ? error.message : 'No se pudo guardar el perfil', true);
	} finally {
		saveProfileButton.disabled = false;
	}
});

profilePhotoInput.addEventListener('change', async () => {
	const photo = profilePhotoInput.files?.[0];
	if (!photo) return;
	setMessage();
	try {
		const body = new FormData();
		body.append('photo', photo);
		const response = await fetch('/api/profile/photo', { method: 'POST', body });
		const result = await response.json() as { user?: ProfileUser; error?: string };
		if (!response.ok || !result.user) throw new Error(result.error || 'No se pudo guardar la foto');
		renderProfile(result.user);
		setMessage('Foto actualizada correctamente.');
	} catch (error) {
		setMessage(error instanceof Error ? error.message : 'No se pudo guardar la foto', true);
	} finally {
		profilePhotoInput.value = '';
	}
});

removeProfilePhoto.addEventListener('click', async () => {
	setMessage();
	try {
		const response = await fetch('/api/profile/photo', {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: '{}',
		});
		const result = await response.json() as { user?: ProfileUser; error?: string };
		if (!response.ok || !result.user) throw new Error(result.error || 'No se pudo quitar la foto');
		renderProfile(result.user);
		setMessage('Foto eliminada.');
	} catch (error) {
		setMessage(error instanceof Error ? error.message : 'No se pudo quitar la foto', true);
	}
});

openExtensionButton.addEventListener('click', () => {
	openExtensionButton.closest<HTMLDetailsElement>('details')?.removeAttribute('open');
	extensionDialog.showModal();
});
closeExtensionButton.addEventListener('click', () => extensionDialog.close());
cancelExtensionButton.addEventListener('click', () => extensionDialog.close());

[profileDialog, extensionDialog].forEach((dialog) => dialog.addEventListener('click', (event) => {
	if (event.target === dialog) dialog.close();
}));
