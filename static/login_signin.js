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

            if (!response.ok) {
                setMessage(data.message || "Invalid userid or password.");
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