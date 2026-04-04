document.addEventListener("DOMContentLoaded", () => {
	const form = document.querySelector("form");
	if (!form) return;

	const useridInput =
		form.querySelector('input[name="userid"]') ||
		form.querySelector('input[type="text"]') ||
		form.querySelector("#userid");

	const passwordInput =
		form.querySelector('input[name="password"]') ||
		form.querySelector('input[type="password"]') ||
		form.querySelector("#password");

	const submitBtn =
		form.querySelector('button[type="submit"]') ||
		form.querySelector('input[type="submit"]');

	const messageEl = document.createElement("p");
	messageEl.id = "login-message";
	messageEl.style.marginTop = "8px";
	form.appendChild(messageEl);

	const setMessage = (text, isError = true) => {
		messageEl.textContent = text;
		messageEl.style.color = isError ? "#c62828" : "#2e7d32";
	};

	form.addEventListener("submit", async (event) => {
		event.preventDefault();

		const userid = (useridInput?.value || "").trim();
		const password = passwordInput?.value || "";

		if (!userid || !password) {
			setMessage("Please enter userid and password.");
			return;
		}

		if (submitBtn) submitBtn.disabled = true;
		setMessage("Logging in...", false);

		try {
			const endpoint = "/login";

			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ userid, password }),
			})
            console.log(userid, password);

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				setMessage(data.message || "Invalid userid or password.");
				return;
			}

			setMessage("Login successful. Redirecting...", false);

			const redirectTo = data.redirect || form.dataset.redirect || "/";
			window.location.href = redirectTo;
		} catch (_error) {
			setMessage("Unable to login. Please try again.");
		} finally {
			if (submitBtn) submitBtn.disabled = false;
		}
	});
});
