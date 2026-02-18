function loadCourses(){
     console.log("Loading Courses...")
     fetch(courses)
}
document.addEventListener("DOMContentLoaded",() => {
    document.getElementById("load-courses-but").addEventListener("click", loadCourses)
})
   