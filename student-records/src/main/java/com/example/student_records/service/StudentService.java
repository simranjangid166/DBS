package com.example.student_records.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.student_records.dto.StudentRequest;
import com.example.student_records.entity.Student;
import com.example.student_records.repository.StudentRepository;

@Service
public class StudentService {

    private final StudentRepository repository;

    public StudentService(StudentRepository repository) {
        this.repository = repository;
    }

    public Student create(StudentRequest request) {
        Student student = new Student();
        apply(student, request);
        return repository.save(student);
    }

    public List<Student> getAll() {
        return repository.findAll();
    }

    public Student getById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found"));
    }

    public Student update(String id, StudentRequest request) {
        Student student = getById(id);
        apply(student, request);
        return repository.save(student);
    }

    public void delete(String id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Student not found");
        }

        repository.deleteById(id);
    }

    private void apply(Student student, StudentRequest request) {
        student.setName(request.getName());
        student.setAge(request.getAge());
        student.setCourse(request.getCourse());
        student.setEmail(request.getEmail());
    }
}