// src/hooks/useAdminData.js
"use client";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { DEFAULT_LESSON_NAMES, addDays, getCategoryFromId, MAX_STUDENTS } from "@/utils/adminConstants";

export function useAdminData() {
  // --- GLOBAL STATE ---
  const [allCourses, setAllCourses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- FILTER STATE ---
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableRounds, setAvailableRounds] = useState([]);

  // --- HELPER: Save Course to DB ---
  const saveCourseToFirebase = async (course) => {
    try {
      const { category, round } = course._path;
      const lessonsToSave = course.lessons.map((l) => {
        const { ...rest } = l; 
        return rest; // Saves students array to keep rosters in sync
      });
      const docRef = doc(db, "courses", category, round, course.name);
      await setDoc(docRef, {
        name: course.name,
        timeSlot: course.timeSlot,
        lessons: lessonsToSave
      });
    } catch (e) {
      console.error("Error saving course:", e);
    }
  };

  // --- HELPER: Sync Student Profile ---
  const syncStudentProfile = async (studentCode, courseId, courseRound, lessonData, action, courseTimeSlot) => {
    try {
      const studentRef = doc(db, "students", studentCode);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) return;

      const data = studentSnap.data();
      let enrollment = data.enrollment || [];
      let idx = enrollment.findIndex((e) => e.courseName === courseId && (e.round === courseRound || e.iteration === courseRound));

      if (idx === -1) {
        enrollment.push({ courseName: courseId, round: courseRound, lessons: [] });
        idx = enrollment.length - 1;
      }

      let lessons = enrollment[idx].lessons || [];

      if (action === "add") {
        if (!lessons.some((l) => l.id === lessonData.id)) {
          lessons.push({
            id: lessonData.id,
            name: lessonData.name,
            dateStr: lessonData.dateStr,
            timeSlot: courseTimeSlot || "",
            courseName: courseId,
            completed: false
          });
        }
      } else {
        lessons = lessons.filter((l) => l.id !== lessonData.id);
      }

      enrollment[idx].lessons = lessons;
      await updateDoc(studentRef, { enrollment });
    } catch (e) {
      console.error("sync error:", e);
    }
  };

  // --- LOAD DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const categories = ["SPEC", "WRIT", "ORAL"];
        const rounds = ["round_001", "round_002", "round_003"];
        const loadedCourses = [];

        // Fetch Courses
        for (const cat of categories) {
          for (const rnd of rounds) {
            const roundRef = collection(db, "courses", cat, rnd);
            try {
              const snapshot = await getDocs(roundRef);
              snapshot.forEach((snap) => {
                const data = snap.data();
                const sanitizedLessons = (data.lessons || []).map((l) => ({
                  id: l.id,
                  name: l.name,
                  dateStr: l.dateStr,
                  completed: !!l.completed,
                  students: l.students || []
                })) || [];
                loadedCourses.push({
                  id: snap.id,
                  name: data.name,
                  timeSlot: data.timeSlot,
                  lessons: sanitizedLessons,
                  _path: { category: cat, round: rnd }
                });
              });
            } catch {}
          }
        }
        loadedCourses.sort((a, b) => a.name.localeCompare(b.name));

        // Fetch Students
        const studentsSnapshot = await getDocs(collection(db, "students"));
        const loadedStudents = [];
        studentsSnapshot.forEach((docSnap) => {
          const studentId = docSnap.id;
          const studentData = docSnap.data();
          loadedStudents.push({
            id: studentId,
            name: studentData.personalInfo?.name || "Unknown",
            personalInfo: studentData.personalInfo || {},
            enrollment: studentData.enrollment || []
          });

          // Legacy Sync Logic (Optional if DB is source of truth)
          if (Array.isArray(studentData.enrollment)) {
            studentData.enrollment.forEach((enr) => {
              const targetCourseId = enr.courseName;
              const targetRound = enr.round || enr.iteration;
              const course = loadedCourses.find(c => c.id === targetCourseId && (!targetRound || c._path.round === targetRound));
              if (!course || !Array.isArray(enr.lessons)) return;

              enr.lessons.forEach((sl) => {
                const lesson = course.lessons.find((l) => l.id === sl.id);
                if (lesson && !lesson.students.includes(studentId)) {
                   // lesson.students.push(studentId); // Uncomment if you need legacy merge
                }
              });
            });
          }
        });
        loadedStudents.sort((a, b) => a.id.localeCompare(b.id));

        setAllCourses(loadedCourses);
        setAllStudents(loadedStudents);

        const uniqueCats = Array.from(new Set(loadedCourses.map((c) => c._path.category))).sort();
        const uniqueRounds = Array.from(new Set(loadedCourses.map((c) => c._path.round))).sort();
        setAvailableCategories(uniqueCats);
        setAvailableRounds(uniqueRounds);

      } catch (e) {
        console.error("Error loading data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- ACTIONS ---
  
  const createCourse = async (name, time, date, roundNumber) => {
    const lessons = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: DEFAULT_LESSON_NAMES[i],
      dateStr: addDays(date, i * 7),
      completed: false,
      students: []
    }));
    const category = getCategoryFromId(name);
    const roundName = `round_${roundNumber.padStart(3, "0")}`;
    const newCourse = {
      id: name,
      name: name,
      timeSlot: time,
      lessons,
      _path: { category, round: roundName }
    };

    setAllCourses((prev) => [...prev, newCourse]);
    if (!availableCategories.includes(category)) setAvailableCategories((prev) => [...prev, category].sort());
    if (!availableRounds.includes(roundName)) setAvailableRounds((prev) => [...prev, roundName].sort());
    
    await saveCourseToFirebase(newCourse);
    return category; // return for filter update
  };

  const deleteCourse = async (course) => {
     try {
      await deleteDoc(doc(db, "courses", course._path.category, course._path.round, course.id));
      setAllCourses(prev => prev.filter(c => c.id !== course.id));
    } catch(e) { console.error(e); }
  };

  const addStudentToLesson = async (courseId, lessonId, studentId) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return;
    const lesson = course.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    
    // Checks
    if ((lesson.students.length || 0) >= MAX_STUDENTS) return { success: false, msg: "Class full" };
    if (lesson.students.includes(studentId)) return { success: false, msg: "Already in lesson" };
    
    // Conflict Check
    for (const c of allCourses) {
      if (c.id === courseId) continue;
      const l = c.lessons.find((x) => x.id === lessonId);
      if (l && l.students.includes(studentId)) {
        return { success: false, msg: `Conflict: student in ${c.name}` };
      }
    }

    await syncStudentProfile(studentId, courseId, course._path.round, lesson, "add", course.timeSlot);
    
    const updatedCourse = { 
      ...course, 
      lessons: course.lessons.map((l) => l.id === lessonId ? { ...l, students: [...l.students, studentId] } : l) 
    };
    
    setAllCourses((prev) => prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c)));
    saveCourseToFirebase(updatedCourse);
    return { success: true };
  };

  const removeStudentFromLesson = async (courseId, lessonId, studentCode) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return;
    const lesson = course.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;

    await syncStudentProfile(studentCode, courseId, course._path.round, lesson, "remove", course.timeSlot);

    const updatedCourse = {
      ...course,
      lessons: course.lessons.map((l) => l.id === lessonId ? { ...l, students: l.students.filter((s) => s !== studentCode) } : l)
    };
    setAllCourses((prev) => prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c)));
    saveCourseToFirebase(updatedCourse);
  };

  const toggleLessonCompletion = (courseId, lessonId) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return;
    const updated = {
      ...course,
      lessons: course.lessons.map((l) => l.id === lessonId ? { ...l, completed: !l.completed } : l)
    };
    setAllCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    saveCourseToFirebase(updated);
  };

  const shiftCourseDates = (courseId, startLessonId, direction) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return;
    const updated = {
      ...course,
      lessons: course.lessons.map((l) => l.id >= startLessonId ? { ...l, dateStr: addDays(l.dateStr, direction * 7) } : l)
    };
    setAllCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    saveCourseToFirebase(updated);
  };

  // Expose everything
  return {
    allCourses, setAllCourses,
    allStudents, setAllStudents,
    loading,
    availableCategories,
    availableRounds,
    createCourse,
    deleteCourse,
    addStudentToLesson,
    removeStudentFromLesson,
    toggleLessonCompletion,
    shiftCourseDates,
    saveCourseToFirebase // Exported for specific use cases like enrollment
  };
}
