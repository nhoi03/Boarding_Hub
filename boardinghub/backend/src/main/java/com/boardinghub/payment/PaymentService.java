package com.boardinghub.payment;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class PaymentService {
 private final PaymentRepository repo;
 public PaymentService(PaymentRepository repo){this.repo=repo;}
 public List<Payment> all(){return repo.findAll();}
 public Payment one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Payment not found"));}
 public Payment create(Payment input){input.id=null;return repo.save(input);}
 public Payment update(Long id,Payment input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
