document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector("form");
    if (!form) return;

    const useridInput = form.querySelector('input[name="userid"]');
    const passwordInput = form.querySelector('input[name="password"]');
    const submitBtn = form.querySelector("#login-button");
	const showPasswordCheckbox = form.querySelector('input[name="show_password"]');

    const messageEl = document.createElement("p");
    messageEl.id = "login-message";
    messageEl.style.marginTop = "8px";
    form.appendChild(messageEl);

    const setMessage = (text, isError = true) => {
        messageEl.textContent = text;
        messageEl.style.color = isError ? "#c62828" : "#2e7d32";
    };

	showPasswordCheckbox.addEventListener("change", () => {
		if (showPasswordCheckbox.checked) {
			passwordInput.type = "text";
		} else {
			passwordInput.type = "password";
		}
	});

	function startCountdown(seconds) {
		const submitBtn = document.querySelector("#login-button");

		submitBtn.disabled = true;

		let remaining = seconds;

		setMessage(
			`Too many login attempts. Try again in ${remaining} seconds.`
		);

		const timer = setInterval(() => {
			remaining--;

			if (remaining <= 0) {
				clearInterval(timer);

				submitBtn.disabled = false;

				setMessage("You can try logging in again.", false);

				return;
			}

			setMessage(
				`Too many login attempts. Try again in ${remaining} seconds.`
			);

		}, 1000);
	}

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const userid = useridInput.value.trim();
        const webpassword = passwordInput.value;

        if (!userid) {
            setMessage("Please enter userid.");
            return;
        } else if (!webpassword) {
			setMessage("Please enter password.");
			return;
		}

        submitBtn.disabled = true;
        setMessage("Logging in...", false);

        try {

            const response = await fetch("/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userid: userid,
                    password: webpassword
                })
            });

            const data = await response.json();

			if (response.status === 429) {
        		const retryAfter = response.headers.get("Retry-After");

				if (retryAfter && !isNaN(Number(retryAfter))) {
					startCountdown(Number(retryAfter));
				} else {
					setMessage("Too many login attempts. Please try again later.");
				}
        		return;
    		}

            if (!response.ok) {
                setMessage(data.message || "Something went wrong.");
                return;
            }

            setMessage("Login successful. Redirecting...", false);

            window.location.href = data.redirect;

        } catch (error) {

            console.error("Login error:", error);
            setMessage("Unable to login. Please try again.");

        } finally {

            submitBtn.disabled = false;
        }
    });

	const signupBtn = document.querySelector("#signup-button");
	signupBtn.addEventListener("click", (event) => {
		event.preventDefault();
		window.location.href = "/signup";
	});
});