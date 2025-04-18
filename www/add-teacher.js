document.addEventListener("DOMContentLoaded", () => {
    const teacherForm = document.getElementById("teacher-form");
    const addTeacherEndpoint = "http://localhost:3000/api/add-teacher";

    teacherForm.addEventListener("submit", async (event) => {
        event.preventDefault();


        const name = document.getElementById("teacher-name").value.trim();
        const floor = document.getElementById("teacher-floor").value.trim();
        const branch = document.getElementById("teacher-branch").value.trim();
        const directions = document.getElementById("teacher-directions").value.trim();
        const imageFile = document.getElementById("teacher-image").files[0];


        console.log("Submission Details:");
        console.log("Name:", name);
        console.log("Floor:", floor);
        console.log("branch:", branch);
        console.log("Directions:", directions);
        console.log("Image File:", imageFile);


        if (!name) {
            console.error("Name is missing or empty");
            alert("Please enter a teacher name.");
            return;
        }
        if (!floor) {
            console.error("Floor is missing or empty");
            alert("Please enter the floor.");
            return;
        }
        if (!branch) {
            console.error("branch is missing or empty");
            alert("Please enter the branch number.");
            return;
        }
        if (!directions) {
            console.error("Directions are missing or empty");
            alert("Please enter directions.");
            return;
        }
        if (!imageFile) {
            console.error("Image file is missing");
            alert("Please upload an image.");
            return;
        }


        const formData = new FormData();
        formData.append("name", name);
        formData.append("floor", floor);
        formData.append("branch", branch);
        formData.append("directions", directions);
        formData.append("image", imageFile);


        for (let [key, value] of formData.entries()) {
            console.log(`FormData - ${key}:`, value);
        }

        try {
            const response = await fetch(addTeacherEndpoint, {
                method: "POST",
                body: formData,
            });


            console.log("Response status:", response.status);
            console.log("Response headers:", response.headers);

            const responseData = await response.json();

            console.log("Full response data:", responseData);

            if (response.ok) {
                alert("Teacher added successfully!");
                teacherForm.reset();
                window.location.href = "index.html";
            } else {
                console.error("Error response:", responseData);
                alert(responseData.error || "Failed to add teacher. Please try again.");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            alert("An error occurred while adding the teacher.");
        }
    });
});