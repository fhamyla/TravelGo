document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("form").addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.querySelector("input[name='name']").value;
        const email = document.querySelector("input[name='email']").value;

        const response = await fetch("http://localhost:5000/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, email }),
        });

        const data = await response.json();
        alert(data.message);
    });
});