document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector("form");
    if (!form) return;

    const usernameInput = form.querySelector('input[name="username"]');
    const useridInput = form.querySelector('input[name="userid"]');
    const passwordInput = form.querySelector('input[name="password"]');
    const submitBtn = form.querySelector("#signup-button");
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

        const username = usernameInput.value;
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
        setMessage("User account created successfully.", false);

        try {

            const response = await fetch("/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    userid: userid,
                    password: webpassword
                })
            });

            // Log the signup request
            // console.log("Signup request sent:", { username, userid, webpassword });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || "Invalid userid or password.");
                return;
            }

            setMessage("Account created successfully. Redirecting...", false);

            window.location.href = data.redirect;

        } catch (error) {
            console.error("Signup error:", error);
            setMessage("Unable to create account. Please try again.");

        } finally {

            submitBtn.disabled = false;
        }
    });
});