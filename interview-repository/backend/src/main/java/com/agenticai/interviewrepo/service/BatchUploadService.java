package com.agenticai.interviewrepo.service;

import com.agenticai.interviewrepo.dto.BatchUploadResult;
import com.agenticai.interviewrepo.dto.AdminStudentCreateRequest;
import com.agenticai.interviewrepo.dto.AdminMentorCreateRequest;
import com.agenticai.interviewrepo.dto.AdminAlumniCreateRequest;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BatchUploadService {

    private final AdminManagementService adminManagementService;

    public BatchUploadResult uploadStudents(MultipartFile file) {
        BatchUploadResult result = BatchUploadResult.builder()
                .totalProcessed(0)
                .successCount(0)
                .failureCount(0)
                .errors(new ArrayList<>())
                .successRecords(new ArrayList<>())
                .build();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            int rowNum = 0;

            for (Row row : sheet) {
                // Skip header row
                if (rowNum == 0) {
                    rowNum++;
                    continue;
                }

                result.setTotalProcessed(result.getTotalProcessed() + 1);

                try {
                    AdminStudentCreateRequest request = new AdminStudentCreateRequest();

                    // Expected columns: Name, RollNumber, Email, Phone, College, Degree, GraduationYear, Skills (no password column)
                    request.setName(getCellValueAsString(row.getCell(0)));
                    request.setRollNumber(getCellValueAsString(row.getCell(1)));
                    request.setEmail(getCellValueAsString(row.getCell(2)));

                    // Auto-generate password
                    String generatedPassword = generatePassword();
                    request.setPassword(generatedPassword);

                    request.setPhone(getCellValueAsString(row.getCell(3)));
                    request.setCollege(getCellValueAsString(row.getCell(4)));
                    request.setDegree(getCellValueAsString(row.getCell(5)));

                    String gradYearStr = getCellValueAsString(row.getCell(6));
                    if (gradYearStr != null && !gradYearStr.isEmpty()) {
                        request.setGraduationYear(Integer.parseInt(gradYearStr));
                    }

                    request.setSkills(getCellValueAsString(row.getCell(7)));

                    // Create student
                    var student = adminManagementService.createStudent(request);

                    result.setSuccessCount(result.getSuccessCount() + 1);
                    result.getSuccessRecords().add(
                            BatchUploadResult.BatchUploadSuccess.builder()
                                    .email(student.getEmail())
                                    .name(student.getName())
                                    .id(student.getId().toString())
                                    .generatedPassword(generatedPassword)
                                    .build()
                    );

                } catch (Exception e) {
                    result.setFailureCount(result.getFailureCount() + 1);
                    result.getErrors().add("Row " + (rowNum + 1) + ": " + e.getMessage());
                }

                rowNum++;
            }

        } catch (Exception e) {
            result.getErrors().add("File processing error: " + e.getMessage());
        }

        return result;
    }

    public BatchUploadResult uploadMentors(MultipartFile file) {
        BatchUploadResult result = BatchUploadResult.builder()
                .totalProcessed(0)
                .successCount(0)
                .failureCount(0)
                .errors(new ArrayList<>())
                .successRecords(new ArrayList<>())
                .build();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            int rowNum = 0;

            for (Row row : sheet) {
                // Skip header row
                if (rowNum == 0) {
                    rowNum++;
                    continue;
                }

                result.setTotalProcessed(result.getTotalProcessed() + 1);

                try {
                    AdminMentorCreateRequest request = new AdminMentorCreateRequest();

                    // Expected columns: Name, FacultyId, Email, Bio, Expertise (no password column)
                    request.setName(getCellValueAsString(row.getCell(0)));
                    request.setFacultyId(getCellValueAsString(row.getCell(1)));
                    request.setEmail(getCellValueAsString(row.getCell(2)));

                    // Auto-generate password
                    String generatedPassword = generatePassword();
                    request.setPassword(generatedPassword);

                    request.setBio(getCellValueAsString(row.getCell(3)));
                    request.setExpertise(getCellValueAsString(row.getCell(4)));

                    // Create mentor
                    var mentor = adminManagementService.createMentor(request);

                    result.setSuccessCount(result.getSuccessCount() + 1);
                    result.getSuccessRecords().add(
                            BatchUploadResult.BatchUploadSuccess.builder()
                                    .email(mentor.getEmail())
                                    .name(mentor.getName())
                                    .id(mentor.getId().toString())
                                    .generatedPassword(generatedPassword)
                                    .build()
                    );

                } catch (Exception e) {
                    result.setFailureCount(result.getFailureCount() + 1);
                    result.getErrors().add("Row " + (rowNum + 1) + ": " + e.getMessage());
                }

                rowNum++;
            }

        } catch (Exception e) {
            result.getErrors().add("File processing error: " + e.getMessage());
        }

        return result;
    }

    public BatchUploadResult uploadAlumni(MultipartFile file) {
        BatchUploadResult result = BatchUploadResult.builder()
                .totalProcessed(0)
                .successCount(0)
                .failureCount(0)
                .errors(new ArrayList<>())
                .successRecords(new ArrayList<>())
                .build();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            int rowNum = 0;

            for (Row row : sheet) {
                // Skip header row
                if (rowNum == 0) {
                    rowNum++;
                    continue;
                }

                result.setTotalProcessed(result.getTotalProcessed() + 1);

                try {
                    AdminAlumniCreateRequest request = new AdminAlumniCreateRequest();

                    // Expected columns: Name, RollNumber, Email, Position, GraduationYear, ExperienceYears, LinkedinUrl, Advice
                    request.setName(getCellValueAsString(row.getCell(0)));
                    request.setRollNumber(getCellValueAsString(row.getCell(1)));
                    request.setEmail(getCellValueAsString(row.getCell(2)));

                    // Auto-generate password
                    request.setPassword(generatePassword());

                    request.setPosition(getCellValueAsString(row.getCell(3)));

                    String gradYearStr = getCellValueAsString(row.getCell(4));
                    if (gradYearStr != null && !gradYearStr.isEmpty()) {
                        request.setGraduationYear(Integer.parseInt(gradYearStr));
                    }

                    String expYearsStr = getCellValueAsString(row.getCell(5));
                    if (expYearsStr != null && !expYearsStr.isEmpty()) {
                        request.setExperienceYears(Integer.parseInt(expYearsStr));
                    }

                    request.setLinkedinUrl(getCellValueAsString(row.getCell(6)));
                    request.setAdvice(getCellValueAsString(row.getCell(7)));

                    // Create alumni
                    var alumni = adminManagementService.createAlumni(request);

                    result.setSuccessCount(result.getSuccessCount() + 1);
                    result.getSuccessRecords().add(
                            BatchUploadResult.BatchUploadSuccess.builder()
                                    .email(alumni.getEmail())
                                    .name(alumni.getName())
                                    .id(alumni.getId().toString())
                                    .generatedPassword(request.getPassword())
                                    .build()
                    );

                } catch (Exception e) {
                    result.setFailureCount(result.getFailureCount() + 1);
                    result.getErrors().add("Row " + (rowNum + 1) + ": " + e.getMessage());
                }

                rowNum++;
            }

        } catch (Exception e) {
            result.getErrors().add("File processing error: " + e.getMessage());
        }

        return result;
    }

    // Template generation methods
    public byte[] generateStudentTemplate() throws Exception {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Students");

        // Create header row
        Row headerRow = sheet.createRow(0);
        String[] headers = {"Name*", "Roll Number", "Email*", "Phone", "College*", "Degree", "Graduation Year", "Skills"};

        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
            sheet.setColumnWidth(i, 4000);
        }

        // Add sample row
        Row sampleRow = sheet.createRow(1);
        sampleRow.createCell(0).setCellValue("John Doe");
        sampleRow.createCell(1).setCellValue("2024001");
        sampleRow.createCell(2).setCellValue("john.doe@example.com");
        sampleRow.createCell(3).setCellValue("9876543210");
        sampleRow.createCell(4).setCellValue("MIT");
        sampleRow.createCell(5).setCellValue("B.Tech Computer Science");
        sampleRow.createCell(6).setCellValue("2028");
        sampleRow.createCell(7).setCellValue("Java, Python, React");

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();
        return outputStream.toByteArray();
    }

    public byte[] generateMentorTemplate() throws Exception {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Mentors");

        // Create header row
        Row headerRow = sheet.createRow(0);
        String[] headers = {"Name*", "Faculty ID", "Email*", "Bio", "Expertise"};

        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
            sheet.setColumnWidth(i, 5000);
        }

        // Add sample row
        Row sampleRow = sheet.createRow(1);
        sampleRow.createCell(0).setCellValue("Dr. Jane Smith");
        sampleRow.createCell(1).setCellValue("FAC12345");
        sampleRow.createCell(2).setCellValue("jane.smith@university.edu");
        sampleRow.createCell(3).setCellValue("Professor of Computer Science");
        sampleRow.createCell(4).setCellValue("AI, Machine Learning, Data Science");

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();
        return outputStream.toByteArray();
    }

    public byte[] generateAlumniTemplate() throws Exception {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Alumni");

        // Create header row
        Row headerRow = sheet.createRow(0);
        String[] headers = {"Name*", "Roll Number", "Email*", "Position", "Graduation Year", "Experience Years", "LinkedIn URL", "Advice"};

        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
            sheet.setColumnWidth(i, 5000);
        }

        // Add sample row
        Row sampleRow = sheet.createRow(1);
        sampleRow.createCell(0).setCellValue("Michael Chen");
        sampleRow.createCell(1).setCellValue("ALU2020001");
        sampleRow.createCell(2).setCellValue("michael.chen@alumni.edu");
        sampleRow.createCell(3).setCellValue("Senior Software Engineer");
        sampleRow.createCell(4).setCellValue("2020");
        sampleRow.createCell(5).setCellValue("4");
        sampleRow.createCell(6).setCellValue("https://linkedin.com/in/michaelchen");
        sampleRow.createCell(7).setCellValue("Stay curious and keep learning!");

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();
        return outputStream.toByteArray();
    }

    // Generate secure random password
    private String generatePassword() {
        String upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lowerCase = "abcdefghijklmnopqrstuvwxyz";
        String digits = "0123456789";
        String specialChars = "!@#$%^&*";
        String allChars = upperCase + lowerCase + digits + specialChars;

        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder(12);

        // Ensure at least one of each type
        password.append(upperCase.charAt(random.nextInt(upperCase.length())));
        password.append(lowerCase.charAt(random.nextInt(lowerCase.length())));
        password.append(digits.charAt(random.nextInt(digits.length())));
        password.append(specialChars.charAt(random.nextInt(specialChars.length())));

        // Fill the rest randomly
        for (int i = 4; i < 12; i++) {
            password.append(allChars.charAt(random.nextInt(allChars.length())));
        }

        // Shuffle the password
        char[] passwordArray = password.toString().toCharArray();
        for (int i = passwordArray.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = passwordArray[i];
            passwordArray[i] = passwordArray[j];
            passwordArray[j] = temp;
        }

        return new String(passwordArray);
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return null;
        }

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    return String.valueOf((int) cell.getNumericCellValue());
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
            default:
                return null;
        }
    }
}
