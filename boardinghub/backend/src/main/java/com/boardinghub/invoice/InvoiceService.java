package com.boardinghub.invoice;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class InvoiceService {
 private final InvoiceRepository repo;
 public InvoiceService(InvoiceRepository repo){this.repo=repo;}
 public List<Invoice> all(){return repo.findAll();}
 public Invoice one(Long id){return repo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Invoice not found"));}
 public Invoice create(Invoice input){input.id=null;return repo.save(input);}
 public Invoice update(Long id,Invoice input){one(id);input.id=id;return repo.save(input);}
 public void delete(Long id){one(id);repo.deleteById(id);}
}
