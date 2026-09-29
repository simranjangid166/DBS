package com.example.student_records.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.example.student_records.entity.Student;

public interface StudentRepository extends MongoRepository<Student, String> {
}